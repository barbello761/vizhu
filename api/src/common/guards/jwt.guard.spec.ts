import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionsService } from '../../modules/auth/sessions/sessions.service';
import { JwtAuthGuard } from './jwt.guard';
import { OptionalJwtAuthGuard } from './optional-jwt.guard';

jest.mock('uuid', () => ({ v7: () => '00000000-0000-7000-8000-000000000000' }));

const contextWith = (req: object) =>
  ({
    switchToHttp: () => ({ getRequest: () => req }),
  }) as unknown as ExecutionContext;

const setup = (payload: object | Error, active = true) => {
  const jwt = {
    verify: jest.fn(() => {
      if (payload instanceof Error) throw payload;
      return payload;
    }),
  };
  const sessions = { isActive: jest.fn().mockResolvedValue(active) };
  const deps = [
    jwt as unknown as JwtService,
    sessions as unknown as SessionsService,
  ] as const;
  return {
    guard: new JwtAuthGuard(...deps),
    optional: new OptionalJwtAuthGuard(...deps),
    sessions,
  };
};

const bearer = () =>
  ({ headers: { authorization: 'Bearer token' } }) as {
    headers: Record<string, string>;
    user?: unknown;
  };

describe('JwtAuthGuard', () => {
  it('пускает с живым сеансом и кладёт payload в запрос', async () => {
    const { guard, sessions } = setup({ sub: 'pa-1', sid: 's-1' });
    const req = bearer();

    await expect(guard.canActivate(contextWith(req))).resolves.toBe(true);
    expect(sessions.isActive).toHaveBeenCalledWith('s-1');
    expect(req.user).toEqual({ sub: 'pa-1', sid: 's-1' });
  });

  it('отвергает токен отозванного сеанса, хотя подпись и срок в порядке', async () => {
    const { guard } = setup({ sub: 'pa-1', sid: 's-1' }, false);

    await expect(
      guard.canActivate(contextWith(bearer())),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('старый токен без sid доживает свои 15 минут', async () => {
    const { guard, sessions } = setup({ sub: 'pa-1' });

    await expect(guard.canActivate(contextWith(bearer()))).resolves.toBe(true);
    expect(sessions.isActive).not.toHaveBeenCalled();
  });

  it('битая подпись и отсутствие заголовка — 401', async () => {
    const { guard } = setup(new Error('bad signature'));

    await expect(
      guard.canActivate(contextWith(bearer())),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      guard.canActivate(contextWith({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('OptionalJwtAuthGuard', () => {
  it('отозванный сеанс превращает запрос в анонимный', async () => {
    const { optional } = setup({ sub: 'pa-1', sid: 's-1' }, false);
    const req = bearer();

    await expect(optional.canActivate(contextWith(req))).resolves.toBe(true);
    expect(req.user).toBeNull();
  });
});
