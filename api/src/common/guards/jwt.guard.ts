import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionsService } from '../../modules/auth/sessions/sessions.service';

export interface JwtPayload {
  sub: string;
  phone: string;
  /**
   * id сеанса (таблица sessions). Нет только у токенов, выпущенных до
   * появления сеансов, — они живут 15 минут и сами сойдут на нет.
   */
  sid?: string;
  iat: number;
  exp: number;
}

type RequestWithUser = {
  headers: Record<string, string | undefined>;
  user?: JwtPayload;
};

/**
 * Проверка access-токена: подпись, срок и — главное для «выйти со всех
 * устройств» — что его сеанс не отозван. Без последнего отозванное
 * устройство работало бы до истечения токена.
 */
export const verifyAccessToken = async (
  jwt: JwtService,
  sessions: SessionsService,
  token: string,
): Promise<JwtPayload | null> => {
  let payload: JwtPayload;
  try {
    payload = jwt.verify<JwtPayload>(token);
  } catch {
    return null;
  }
  if (payload.sid && !(await sessions.isActive(payload.sid))) return null;
  return payload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly sessions: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const auth = req.headers['authorization'];

    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Токен не предоставлен');
    }

    const payload = await verifyAccessToken(
      this.jwt,
      this.sessions,
      auth.slice(7),
    );
    if (!payload) throw new UnauthorizedException('Токен недействителен');
    req.user = payload;
    return true;
  }
}
