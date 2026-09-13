import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { PhoneAccount } from './entities/phone-account.entity';
import { EmailAccount } from './entities/email-account.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { AuthService } from '../auth/auth.service';
import { HistoryEntry } from '../history/history.entity';
import { EmailVerification } from '../mail/entities/email-verification.entity';
import { EmailPurpose } from '../mail/email-purpose.enum';
import { EmailAccountsService } from '../mail/email-accounts.service';
import { MagicLinkService } from '../mail/magic-link.service';
import { UserRole } from './user-role.enum';

interface CreateProfileData {
  name: string;
  role: UserRole;
  /** Необязательна: аккаунты до появления почты и повторные попытки без неё. */
  email?: string;
}

/** Поля, которые пользователь может поменять у себя сам (PATCH /profile). */
export interface UpdateProfileData {
  name?: string;
}

export interface ChangePhoneData {
  phone: string;
  code: string;
  verificationId: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PhoneAccount)
    private readonly phoneAccountRepo: Repository<PhoneAccount>,
    private readonly emailAccounts: EmailAccountsService,
    private readonly magicLink: MagicLinkService,
    private readonly auth: AuthService,
    private readonly dataSource: DataSource,
  ) {}

  async createProfile(
    phoneAccountId: string,
    data: CreateProfileData,
  ): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { phoneAccountId } });
    if (existing) throw new ConflictException('Профиль уже существует');

    const user = await this.userRepo.save(
      this.userRepo.create({
        phoneAccountId,
        name: data.name,
        role: data.role,
        isVerified: true,
      }),
    );

    if (data.email) {
      await this.attachEmailOnRegistration(user, data.email);
    }

    return this.getProfile(phoneAccountId);
  }

  private async attachEmailOnRegistration(
    user: User,
    email: string,
  ): Promise<void> {
    try {
      await this.dataSource.transaction((manager) =>
        this.emailAccounts.setEmail(manager, user, email, false),
      );
      await this.magicLink.request({
        phoneAccountId: user.phoneAccountId,
        purpose: EmailPurpose.VERIFY_EMAIL,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Профиль ${user.uuid} создан, но почта ${email} не подтверждена: ${reason}`,
      );
    }
  }

  async getProfile(phoneAccountId: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { phoneAccountId },
      relations: ['phoneAccount', 'emailAccount'],
    });
    if (!user) throw new NotFoundException('Профиль не найден');
    return user;
  }

  /**
   * Точечное обновление своих данных. Отдаёт профиль целиком (со связями),
   * чтобы клиент положил ответ прямо в кэш и не делал повторный GET.
   */
  async updateProfile(
    phoneAccountId: string,
    data: UpdateProfileData,
  ): Promise<User> {
    const user = await this.getProfile(phoneAccountId);

    if (data.name !== undefined) user.name = data.name;

    await this.userRepo.save(user);
    return this.getProfile(phoneAccountId);
  }

  async changeEmail(
    phoneAccountId: string,
    verificationId: string,
  ): Promise<User> {
    const user = await this.getProfile(phoneAccountId);

    await this.dataSource.transaction(async (manager) => {
      const ticket = await this.magicLink.consume(
        manager,
        phoneAccountId,
        verificationId,
        EmailPurpose.CHANGE_EMAIL,
      );
      await this.emailAccounts.setEmail(manager, user, ticket.email, true);
    });

    return this.getProfile(phoneAccountId);
  }

  async deleteProfile(
    phoneAccountId: string,
    verificationId?: string,
  ): Promise<void> {
    const user = await this.getProfile(phoneAccountId);
    const needsConfirmation = Boolean(user.emailAccount?.verifiedAt);

    if (needsConfirmation && !verificationId) {
      throw new BadRequestException('Подтвердите удаление по ссылке из письма');
    }

    await this.dataSource.transaction(async (manager) => {
      if (needsConfirmation && verificationId) {
        await this.magicLink.consume(
          manager,
          phoneAccountId,
          verificationId,
          EmailPurpose.DELETE_ACCOUNT,
        );
      }

      await manager.delete(HistoryEntry, { phoneAccountId });
      await manager.delete(RefreshToken, { phoneAccountId });
      await manager.delete(EmailVerification, { phoneAccountId });
      await manager.delete(User, { phoneAccountId });
      if (user.emailAccountId) {
        await manager.delete(EmailAccount, { uuid: user.emailAccountId });
      }
      await manager.delete(PhoneAccount, { uuid: phoneAccountId });
    });
  }

  async sendPhoneChangeOtp(
    phoneAccountId: string,
    phone: string,
  ): Promise<void> {
    await this.assertPhoneAvailable(phoneAccountId, phone);
    await this.auth.sendOtp(phone);
  }

  async changePhone(
    phoneAccountId: string,
    data: ChangePhoneData,
  ): Promise<User> {
    const normalizedPhone = await this.assertPhoneAvailable(
      phoneAccountId,
      data.phone,
    );

    // Сперва убеждаемся, что письмо подтверждено, и только потом гасим код:
    // иначе при неоткрытом письме пользователь терял бы SMS-код ни за что.
    await this.magicLink.assertConfirmed(
      phoneAccountId,
      data.verificationId,
      EmailPurpose.CHANGE_PHONE,
    );

    await this.auth.consumeOtp(normalizedPhone, data.code);

    await this.dataSource.transaction(async (manager) => {
      await this.magicLink.consume(
        manager,
        phoneAccountId,
        data.verificationId,
        EmailPurpose.CHANGE_PHONE,
      );
      await manager
        .getRepository(PhoneAccount)
        .update({ uuid: phoneAccountId }, { phone: normalizedPhone });
    });

    return this.getProfile(phoneAccountId);
  }

  /** Нормализует номер и проверяет, что он свободен и отличается от текущего. */
  private async assertPhoneAvailable(
    phoneAccountId: string,
    phone: string,
  ): Promise<string> {
    const normalizedPhone = this.auth.normalizePhone(phone);
    if (normalizedPhone.length < 11) {
      throw new BadRequestException('Неверный формат номера телефона');
    }

    const current = await this.phoneAccountRepo.findOne({
      where: { uuid: phoneAccountId },
    });
    if (current?.phone === normalizedPhone) {
      throw new ConflictException('Это ваш текущий номер телефона');
    }

    const taken = await this.phoneAccountRepo.findOne({
      where: { phone: normalizedPhone, uuid: Not(phoneAccountId) },
    });
    if (taken) {
      throw new ConflictException(
        'Этот номер уже используется другим аккаунтом',
      );
    }

    return normalizedPhone;
  }

  /** Ищет пользователя по его первичному ключу (uuid) — используется матчингом,
   * где идентификатор участника = user.uuid, а не phoneAccountId. */
  async getByUuid(uuid: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { uuid },
      relations: ['phoneAccount', 'emailAccount'],
    });
    if (!user) throw new NotFoundException('Профиль не найден');
    return user;
  }
}
