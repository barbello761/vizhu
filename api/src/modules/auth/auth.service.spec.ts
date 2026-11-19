import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { SmsService } from '../sms/sms.service';
import { PhoneAccount } from '../users/entities/phone-account.entity';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { OtpCode } from './otp-code.entity';

// uuid отдаёт только ESM, а ts-jest собирает CommonJS; сущностям он тут не нужен.
jest.mock('uuid', () => ({ v7: () => '00000000-0000-7000-8000-000000000000' }));

const PHONE = '79990001122';

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
  const refreshTokenRepo = { save: jest.fn().mockResolvedValue(undefined) };
  const jwt = { sign: jest.fn().mockReturnValue('access') };

  const service = new AuthService(
    otpRepo as unknown as Repository<OtpCode>,
    phoneAccountRepo as unknown as Repository<PhoneAccount>,
    refreshTokenRepo as unknown as Repository<RefreshToken>,
    userRepo as unknown as Repository<User>,
    sms as unknown as SmsService,
    jwt as unknown as JwtService,
    config as unknown as ConfigService,
  );

  return {
    service,
    sms,
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
    return { ...ctx, result: await ctx.service.verifyOtp(PHONE, '1111') };
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
