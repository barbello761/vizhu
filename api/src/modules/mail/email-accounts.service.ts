import { ConflictException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  EmailAccount,
  normalizeEmail,
} from '../users/entities/email-account.entity';
import { User } from '../users/entities/user.entity';

const PG_UNIQUE_VIOLATION = '23505';

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  (err as { code?: string }).code === PG_UNIQUE_VIOLATION;

@Injectable()
export class EmailAccountsService {
  async setEmail(
    manager: EntityManager,
    user: User,
    email: string,
    verified: boolean,
  ): Promise<string> {
    const normalized = normalizeEmail(email);
    const verifiedAt = verified ? new Date() : null;
    const accounts = manager.getRepository(EmailAccount);

    try {
      if (user.emailAccountId) {
        await accounts.update(
          { uuid: user.emailAccountId },
          { email: normalized, verifiedAt },
        );
        return user.emailAccountId;
      }

      const account = accounts.create({ email: normalized, verifiedAt });
      await accounts.save(account);
      await manager
        .getRepository(User)
        .update({ uuid: user.uuid }, { emailAccountId: account.uuid });
      return account.uuid;
    } catch (err) {
      // Частичный уникальный индекс по подтверждённым адресам — единственное,
      // что тут может конфликтовать (см. EmailAccount).
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          'Эта почта уже привязана к другому аккаунту',
        );
      }
      throw err;
    }
  }

  async markVerified(
    manager: EntityManager,
    emailAccountId: string,
    expectedEmail: string,
  ): Promise<boolean> {
    try {
      const result = await manager
        .getRepository(EmailAccount)
        .update(
          { uuid: emailAccountId, email: normalizeEmail(expectedEmail) },
          { verifiedAt: new Date() },
        );
      return (result.affected ?? 0) > 0;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          'Эта почта уже привязана к другому аккаунту',
        );
      }
      throw err;
    }
  }
}
