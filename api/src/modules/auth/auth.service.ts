import {
  Injectable,
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomInt } from 'crypto';
import { SmsService } from '../sms/sms.service';
import { OtpCode } from './otp-code.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PhoneAccount } from '../users/entities/phone-account.entity';
import { User } from '../users/entities/user.entity';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { ClientContext, SessionsService } from './sessions/sessions.service';

const OTP_TTL_MINUTES = 5;
const OTP_ATTEMPTS_MAX = 5;
const REFRESH_TTL_DAYS = 30;
/** Сколько живёт СТАРЫЙ refresh-токен после ротации (см. refresh()). */
const ROTATION_GRACE_MS = 60_000;
const REFRESH_COOKIE = 'refresh_token';

export { REFRESH_COOKIE };

/** Срок нового refresh-токена — он же новый срок жизни сеанса. */
const refreshExpiry = (): Date => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);
  return expiresAt;
};

export interface VerifyOtpResult {
  accessToken: string;
  refreshToken: string;
  /**
   * Профиля (строки в users) ещё нет — клиент ведёт на регистрацию.
   * Не путать с «номер впервые»: phone_accounts заводится на первом же коде,
   * и брошенная регистрация оставляла номер без профиля. Раньше флаг считался
   * по phone_accounts, и при повторном входе такой пользователь шёл мимо
   * регистрации в приложение, где GET /profile отвечал 404 и его выкидывало.
   */
  isNewUser: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(OtpCode)
    private readonly otpRepo: Repository<OtpCode>,
    @InjectRepository(PhoneAccount)
    private readonly phoneAccountRepo: Repository<PhoneAccount>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly sms: SmsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sessions: SessionsService,
  ) {}

  //режим дев-разработки не делает звонок в smsc - для этого есть секретный мастер-ключ.
  private get bypassCode(): string | null {
    if (this.config.get<string>('NODE_ENV') === 'production') return null;
    const code = this.config.get<string>('OTP_BYPASS')?.trim();
    if (!code || !/^\d{4}$/.test(code)) return null;
    return code;
  }

  /**
   * Демо-стенд: код, который принимается НАРЯДУ с настоящим из звонка.
   * В отличие от OTP_BYPASS звонок не отменяется и режим работает в production-
   * сборке — стенд крутит те же образы, что прод. На проде переменная не задаётся.
   */
  private get demoCode(): string | null {
    const code = this.config.get<string>('DEMO_OTP_CODE')?.trim();
    if (!code || !/^\d{4}$/.test(code)) return null;
    return code;
  }

  async sendOtp(phone: string): Promise<void> {
    const normalizedPhone = this.normalizePhone(phone);
    const bypass = this.bypassCode;
    const code = bypass ?? randomInt(1000, 10000).toString();

    await this.otpRepo.delete({ phone: normalizedPhone });

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_TTL_MINUTES);

    await this.otpRepo.save({
      phone: normalizedPhone,
      code,
      attempts: 0,
      expiresAt,
    });

    if (bypass) {
      this.logger.warn(
        `OTP_BYPASS активен: звонок не выполняется, код для ${normalizedPhone} — ${code}`,
      );
      return;
    }

    try {
      await this.sms.sendOtp(normalizedPhone, code);
    } catch (err) {
      // На демо недозвон не должен запирать вход: у пользователя есть demoCode.
      if (!this.demoCode) throw err;
      this.logger.warn(
        `Звонок на ${normalizedPhone} не удался, вход возможен по DEMO_OTP_CODE`,
      );
      return;
    }
    this.logger.log(`OTP отправлен на ${normalizedPhone}`);
  }

  async consumeOtp(phone: string, code: string): Promise<string> {
    const normalizedPhone = this.normalizePhone(phone);

    const otp = await this.otpRepo.findOne({
      where: { phone: normalizedPhone },
    });
    if (!otp) throw new BadRequestException('Код не найден. Запросите новый.');

    if (new Date() > otp.expiresAt) {
      await this.otpRepo.delete({ id: otp.id });
      throw new BadRequestException('Код истёк. Запросите новый.');
    }

    otp.attempts += 1;
    await this.otpRepo.save(otp);

    if (otp.attempts > OTP_ATTEMPTS_MAX) {
      await this.otpRepo.delete({ id: otp.id });
      throw new BadRequestException(
        'Превышено количество попыток. Запросите новый код.',
      );
    }

    if (otp.code !== code && code !== this.demoCode)
      throw new BadRequestException('Неверный код');

    await this.otpRepo.delete({ id: otp.id });
    return normalizedPhone;
  }

  async verifyOtp(
    phone: string,
    code: string,
    context: ClientContext,
  ): Promise<VerifyOtpResult> {
    const normalizedPhone = await this.consumeOtp(phone, code);

    let phoneAccount = await this.phoneAccountRepo.findOne({
      where: { phone: normalizedPhone },
    });
    if (!phoneAccount) {
      phoneAccount = this.phoneAccountRepo.create({ phone: normalizedPhone });
      await this.phoneAccountRepo.save(phoneAccount);
    }

    const isNewUser = !(await this.userRepo.exists({
      where: { phoneAccountId: phoneAccount.uuid },
    }));

    // Каждый вход по коду — новый сеанс, даже с того же устройства: после
    // выхода прежний сеанс уже удалён, а склеивать «похожие» по UA — гадание.
    const expiresAt = refreshExpiry();
    const session = await this.sessions.open(
      phoneAccount.uuid,
      context,
      expiresAt,
    );
    const refreshToken = await this.createRefreshToken(
      phoneAccount.uuid,
      session.id,
      expiresAt,
    );
    const accessToken = this.signAccess(
      phoneAccount.uuid,
      normalizedPhone,
      session.id,
    );

    return { accessToken, refreshToken, isNewUser };
  }

  async refresh(
    rawToken: string,
    context: ClientContext,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const hash = this.hashToken(rawToken);
    const record = await this.refreshTokenRepo.findOne({
      where: { tokenHash: hash },
      relations: ['phoneAccount'],
    });

    if (!record || new Date() > record.expiresAt) {
      if (record) await this.refreshTokenRepo.delete({ uuid: record.uuid });
      throw new UnauthorizedException('Refresh token недействителен');
    }

    const expiresAt = refreshExpiry();
    let sessionId = record.sessionId;
    if (sessionId) {
      await this.sessions.touch(sessionId, expiresAt);
    } else {
      // Токен выдан до появления сеансов: заводим сеанс сейчас, иначе после
      // выкладки всех вошедших пришлось бы разлогинить. Устройство — то, с
      // которого пришёл refresh: токен с него и прислан.
      sessionId = (
        await this.sessions.open(record.phoneAccountId, context, expiresAt)
      ).id;
    }

    // Ротация с grace-окном вместо мгновенного удаления: мобильный клиент
    // может не успеть сохранить новый токен (приложение убили, сеть оборвалась
    // после ответа) — тогда он повторно придёт со старым токеном и получит
    // новую пару, а не вечный разлогин. Старый токен доживает ROTATION_GRACE_MS.
    // Сеанс ему проставляем тоже: повтор старого токена не должен заводить
    // ещё один сеанс, а отзыв сеанса — гасить и его.
    const graceDeadline = new Date(Date.now() + ROTATION_GRACE_MS);
    await this.refreshTokenRepo.update(
      { uuid: record.uuid },
      {
        expiresAt:
          record.expiresAt > graceDeadline ? graceDeadline : record.expiresAt,
        sessionId,
      },
    );

    // Заодно подчищаем протухшие токены аккаунта (в т.ч. отработавшие grace).
    await this.refreshTokenRepo.delete({
      phoneAccountId: record.phoneAccountId,
      expiresAt: LessThan(new Date()),
    });

    const newRefreshToken = await this.createRefreshToken(
      record.phoneAccountId,
      sessionId,
      expiresAt,
    );
    const accessToken = this.signAccess(
      record.phoneAccount.uuid,
      record.phoneAccount.phone,
      sessionId,
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  /** Выход на этом устройстве: гасим весь сеанс, а не только предъявленный токен. */
  async logout(rawToken: string): Promise<void> {
    const record = await this.refreshTokenRepo.findOne({
      where: { tokenHash: this.hashToken(rawToken) },
    });
    if (!record) return;
    if (record.sessionId) {
      await this.sessions.close(record.sessionId);
    } else {
      await this.refreshTokenRepo.delete({ uuid: record.uuid });
    }
  }

  private signAccess(
    phoneAccountId: string,
    phone: string,
    sessionId: string,
  ): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: phoneAccountId,
      phone,
      sid: sessionId,
    };
    return this.jwt.sign(payload);
  }

  private async createRefreshToken(
    phoneAccountId: string,
    sessionId: string,
    expiresAt: Date,
  ): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    await this.refreshTokenRepo.save({
      phoneAccountId,
      sessionId,
      tokenHash: this.hashToken(raw),
      expiresAt,
    });
    return raw;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Публичный: смена номера приводит ввод к тому же виду до проверки занятости. */
  normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('8')) return '7' + digits.slice(1);
    return digits;
  }
}
