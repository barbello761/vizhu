import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { SmsService } from '../sms/sms.service';
import { PhoneAccount } from '../users/entities/phone-account.entity';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { OtpCode } from './otp-code.entity';
import { SessionClient } from './sessions/device-info';
import { SessionsService } from './sessions/sessions.service';

// uuid отдаёт только ESM, а ts-jest собирает CommonJS; сущностям он тут не нужен.
jest.mock('uuid', () => ({ v7: () => '00000000-0000-7000-8000-000000000000' }));

const PHONE = '79990001122';
const CONTEXT = { client: SessionClient.NATIVE, userAgent: 'test-agent' };

interface SetupDeps {
  /** Номер уже заводили (первый код когда-то проверен). */
  phoneAccount?: Partial<PhoneAccount> | null;
  /** Профиль в users создан — регистрация пройдена. */
  hasProfile?: boolean;
}

const setup = (env: Record<string, string>, deps: SetupDeps = {}) => {
  const store = new Map<string, OtpCode>();
  const otpRepo = {
    delete: jest.fn((where: Partial<OtpCode>) => {
      for (const [phone, otp] of store) {
        if (otp.phone === where.phone || otp.id === where.id)
          store.delete(phone);
      }
      return Promise.resolve();
    }),
    save: jest.fn((otp: OtpCode) => {
      const saved = { ...otp, id: otp.id ?? 'otp-1' };
      store.set(saved.phone, saved);
      return Promise.resolve(saved);
    }),
    findOne: jest.fn(({ where }: { where: { phone: string } }) =>
      Promise.resolve(store.get(where.phone) ?? null),
    ),
  };
  const sms = { sendOtp: jest.fn().mockResolvedValue(undefined) };
  const config = { get: (key: string) => env[key] };

  const phoneAccountRepo = {
    findOne: jest.fn().mockResolvedValue(deps.phoneAccount ?? null),
    create: jest.fn((data: Partial<PhoneAccount>) => ({
      uuid: 'pa-new',
      ...data,
    })),
    save: jest.fn((account: PhoneAccount) => Promise.resolve(account)),
  };
  const userRepo = {
    exists: jest.fn().mockResolvedValue(deps.hasProfile ?? false),
  };
  const refreshTokenRepo = {
    save: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const jwt = { sign: jest.fn().mockReturnValue('access') };
  const sessions = {
    open: jest.fn().mockResolvedValue({ id: 'session-new' }),
    touch: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  };

  const service = new AuthService(
    otpRepo as unknown as Repository<OtpCode>,
    phoneAccountRepo as unknown as Repository<PhoneAccount>,
    refreshTokenRepo as unknown as Repository<RefreshToken>,
    userRepo as unknown as Repository<User>,
    sms as unknown as SmsService,
    jwt as unknown as JwtService,
    config as unknown as ConfigService,
    sessions as unknown as SessionsService,
  );

  return {
    service,
    sms,
    jwt,
    sessions,
    refreshTokenRepo,
    phoneAccountRepo,
    sentCode: () => store.get(PHONE)?.code,
  };
};

describe('AuthService — DEMO_OTP_CODE', () => {
  it('звонит как обычно и принимает демо-код', async () => {
    const { service, sms } = setup({
      NODE_ENV: 'production',
      DEMO_OTP_CODE: '8153',
    });

    await service.sendOtp(PHONE);
    expect(sms.sendOtp).toHaveBeenCalledTimes(1);

    await expect(service.consumeOtp(PHONE, '8153')).resolves.toBe(PHONE);
  });

  it('принимает и настоящий код из звонка', async () => {
    const { service, sentCode } = setup({
      NODE_ENV: 'production',
      DEMO_OTP_CODE: '8153',
    });

    await service.sendOtp(PHONE);
    await expect(service.consumeOtp(PHONE, sentCode()!)).resolves.toBe(PHONE);
  });

  it('не падает при ошибке SMSC — вход остаётся по демо-коду', async () => {
    const { service, sms } = setup({
      NODE_ENV: 'production',
      DEMO_OTP_CODE: '8153',
    });
    sms.sendOtp.mockRejectedValueOnce(new Error('SMSC down'));

    await expect(service.sendOtp(PHONE)).resolves.toBeUndefined();
    await expect(service.consumeOtp(PHONE, '8153')).resolves.toBe(PHONE);
  });

  it('без переменной демо-код не работает, а ошибка SMSC пробрасывается', async () => {
    const { service, sms, sentCode } = setup({ NODE_ENV: 'production' });

    await service.sendOtp(PHONE);
    const wrong = sentCode() === '8153' ? '8154' : '8153';
    await expect(service.consumeOtp(PHONE, wrong)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    sms.sendOtp.mockRejectedValueOnce(new Error('SMSC down'));
    await expect(service.sendOtp(PHONE)).rejects.toThrow('SMSC down');
  });
});

describe('AuthService.verifyOtp — isNewUser', () => {
  const ENV = { NODE_ENV: 'development', OTP_BYPASS: '1111' };

  const verify = async (deps: SetupDeps) => {
    const ctx = setup(ENV, deps);
    await ctx.service.sendOtp(PHONE);
    return {
      ...ctx,
      result: await ctx.service.verifyOtp(PHONE, '1111', CONTEXT),
    };
  };

  it('первый вход: заводит номер и ведёт на регистрацию', async () => {
    const { result, phoneAccountRepo } = await verify({ phoneAccount: null });
    expect(phoneAccountRepo.save).toHaveBeenCalledTimes(1);
    expect(result.isNewUser).toBe(true);
  });

  it('регистрацию бросили — номер есть, профиля нет: снова регистрация', async () => {
    const { result, phoneAccountRepo } = await verify({
      phoneAccount: { uuid: 'pa-1', phone: PHONE },
      hasProfile: false,
    });
    expect(phoneAccountRepo.save).not.toHaveBeenCalled();
    expect(result.isNewUser).toBe(true);
  });

  it('профиль есть — обычный вход', async () => {
    const { result } = await verify({
      phoneAccount: { uuid: 'pa-1', phone: PHONE },
      hasProfile: true,
    });
    expect(result.isNewUser).toBe(false);
  });
});

describe('AuthService — сеансы', () => {
  const ENV = { NODE_ENV: 'development', OTP_BYPASS: '1111' };
  const ACCOUNT = { uuid: 'pa-1', phone: PHONE };

  const storedToken = (overrides: Partial<RefreshToken> = {}) => ({
    uuid: 'rt-1',
    phoneAccountId: ACCOUNT.uuid,
    phoneAccount: ACCOUNT,
    sessionId: 'session-1',
    expiresAt: new Date(Date.now() + 86_400_000),
    ...overrides,
  });

  it('вход по коду открывает сеанс и кладёт его id в токены', async () => {
    const ctx = setup(ENV, { phoneAccount: ACCOUNT, hasProfile: true });
    await ctx.service.sendOtp(PHONE);
    await ctx.service.verifyOtp(PHONE, '1111', CONTEXT);

    expect(ctx.sessions.open).toHaveBeenCalledWith(
      ACCOUNT.uuid,
      CONTEXT,
      expect.any(Date),
    );
    expect(ctx.refreshTokenRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'session-new' }),
    );
    expect(ctx.jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: ACCOUNT.uuid, sid: 'session-new' }),
    );
  });

  it('refresh ротирует токен внутри того же сеанса и отмечает активность', async () => {
    const ctx = setup(ENV);
    ctx.refreshTokenRepo.findOne.mockResolvedValue(storedToken());

    await ctx.service.refresh('raw', CONTEXT);

    expect(ctx.sessions.open).not.toHaveBeenCalled();
    expect(ctx.sessions.touch).toHaveBeenCalledWith(
      'session-1',
      expect.any(Date),
    );
    expect(ctx.refreshTokenRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'session-1' }),
    );
    expect(ctx.jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sid: 'session-1' }),
    );
  });

  it('старый токен без сеанса получает сеанс, а не разлогин', async () => {
    const ctx = setup(ENV);
    ctx.refreshTokenRepo.findOne.mockResolvedValue(
      storedToken({ sessionId: null }),
    );

    await ctx.service.refresh('raw', CONTEXT);

    expect(ctx.sessions.open).toHaveBeenCalledWith(
      ACCOUNT.uuid,
      CONTEXT,
      expect.any(Date),
    );
    // Старый токен в grace-окне тоже привязан: его повтор не заведёт второй сеанс.
    expect(ctx.refreshTokenRepo.update).toHaveBeenCalledWith(
      { uuid: 'rt-1' },
      expect.objectContaining({ sessionId: 'session-new' }),
    );
    expect(ctx.jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sid: 'session-new' }),
    );
  });

  it('протухший refresh-токен — 401', async () => {
    const ctx = setup(ENV);
    ctx.refreshTokenRepo.findOne.mockResolvedValue(
      storedToken({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(ctx.service.refresh('raw', CONTEXT)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(ctx.sessions.touch).not.toHaveBeenCalled();
  });

  it('выход закрывает весь сеанс', async () => {
    const ctx = setup(ENV);
    ctx.refreshTokenRepo.findOne.mockResolvedValue(storedToken());

    await ctx.service.logout('raw');

    expect(ctx.sessions.close).toHaveBeenCalledWith('session-1');
    expect(ctx.refreshTokenRepo.delete).not.toHaveBeenCalled();
  });

  it('выход со старым токеном без сеанса удаляет сам токен', async () => {
    const ctx = setup(ENV);
    ctx.refreshTokenRepo.findOne.mockResolvedValue(
      storedToken({ sessionId: null }),
    );

    await ctx.service.logout('raw');

    expect(ctx.sessions.close).not.toHaveBeenCalled();
    expect(ctx.refreshTokenRepo.delete).toHaveBeenCalledWith({ uuid: 'rt-1' });
  });
});
