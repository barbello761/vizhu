import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionsService } from '../../modules/auth/sessions/sessions.service';
import { type JwtPayload, verifyAccessToken } from './jwt.guard';

type RequestWithUser = {
  headers: Record<string, string | undefined>;
  user?: JwtPayload | null;
};

/** Как JwtAuthGuard, но без токена (или с отозванным) пускает анонимом. */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly sessions: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const auth = req.headers['authorization'];

    req.user = auth?.startsWith('Bearer ')
      ? await verifyAccessToken(this.jwt, this.sessions, auth.slice(7))
      : null;
    return true;
  }
}
