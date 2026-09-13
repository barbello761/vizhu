import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, LessThan, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';

import { User } from '../users/entities/user.entity';
import { normalizeEmail } from '../users/entities/email-account.entity';
import { EmailVerification } from './entities/email-verification.entity';
import {
  EmailPurpose,
  PURPOSES_USING_ACCOUNT_EMAIL,
} from './email-purpose.enum';
import { EmailAccountsService } from './email-accounts.service';
import { MailService } from './mail.service';
import { buildMagicLinkMail } from './templates';

const TOKEN_TTL_MINUTES = 30;
/** Не чаще одного письма в минуту на пару (аккаунт, действие). */
const RESEND_COOLDOWN_MS = 60_000;
const DEFAULT_APP_URL = 'https://app.vizhu.su';

export type VerificationStatus =
  | 'pending'
  | 'confirmed'
  | 'consumed'
  | 'expired';

export interface RequestVerificationInput {
  phoneAccountId: string;
  purpose: EmailPurpose;
  /** Обязателен для VERIFY_EMAIL и CHANGE_EMAIL — это и есть проверяемый адрес. */
  email?: string;
}

@Injectable()
export class MagicLinkService {
  private readonly logger = new Logger(MagicLinkService.name);
  private readonly appUrl: string;

  constructor(
    @InjectRepository(EmailVerification)
    private readonly tickets: Repository<EmailVerification>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly emailAccounts: EmailAccountsService,
    private readonly mail: MailService,
    private readonly dataSource: DataSource,
    config: ConfigService,
  ) {
    this.appUrl = (
      config.get<string>('APP_URL')?.trim() || DEFAULT_APP_URL
    ).replace(/\/+$/, '');
  }

  /** Выпускает тикет и отправляет письмо. */
  async request(input: RequestVerificationInput): Promise<EmailVerification> {
    const email = await this.resolveEmail(input);

    const lastSent = await this.tickets.findOne({
      where: { phoneAccountId: input.phoneAccountId, purpose: input.purpose },
      order: { createdAt: 'DESC' },
    });
    if (
      lastSent &&
      Date.now() - lastSent.createdAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      throw new HttpException(
        'Письмо уже отправлено. Следующее можно запросить через минуту.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Прошлые тикеты того же действия обесцениваем: иначе ссылка из старого
    // письма осталась бы рабочей и «отменить, отправив новое» было бы нельзя.
    await this.tickets.delete({
      phoneAccountId: input.phoneAccountId,
      purpose: input.purpose,
    });
    await this.tickets.delete({ expiresAt: LessThan(new Date()) });

    const rawToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000);

    const ticket = await this.tickets.save(
      this.tickets.create({
        phoneAccountId: input.phoneAccountId,
        purpose: input.purpose,
        email,
        tokenHash: this.hashToken(rawToken),
        expiresAt,
      }),
    );

    try {
      await this.mail.send(
        buildMagicLinkMail(
          input.purpose,
          email,
          `${this.appUrl}/magic-link?token=${rawToken}`,
          TOKEN_TTL_MINUTES,
        ),
      );
    } catch (err) {
      // Тикет без письма только мешает: он занял бы «минуту тишины» на
      // повторную отправку, а подтвердить его всё равно нечем.
      await this.tickets.delete({ uuid: ticket.uuid });
      throw err;
    }

    this.logger.log(
      `Письмо ${input.purpose} отправлено на ${email} (тикет ${ticket.uuid})`,
    );
    return ticket;
  }

  async confirm(rawToken: string): Promise<{ purpose: EmailPurpose }> {
    const ticket = await this.tickets.findOne({
      where: { tokenHash: this.hashToken(rawToken) },
    });
    if (!ticket) {
      throw new BadRequestException('Ссылка недействительна');
    }
    if (!ticket.confirmedAt && ticket.expiresAt < new Date()) {
      throw new BadRequestException('Срок действия ссылки истёк');
    }

    if (ticket.confirmedAt) {
      return { purpose: ticket.purpose };
    }

    // VERIFY_EMAIL завершается прямо здесь: экрана «Я перешёл по ссылке» у него
    // нет — адрес подтверждают при регистрации, не прерывая её (см. README).
    if (ticket.purpose === EmailPurpose.VERIFY_EMAIL) {
      await this.dataSource.transaction(async (manager) => {
        const user = await manager.getRepository(User).findOne({
          where: { phoneAccountId: ticket.phoneAccountId },
        });
        if (user?.emailAccountId) {
          await this.emailAccounts.markVerified(
            manager,
            user.emailAccountId,
            ticket.email,
          );
        }
        await manager
          .getRepository(EmailVerification)
          .update(
            { uuid: ticket.uuid },
            { confirmedAt: new Date(), consumedAt: new Date() },
          );
      });
      return { purpose: ticket.purpose };
    }

    await this.tickets.update(
      { uuid: ticket.uuid },
      { confirmedAt: new Date() },
    );
    return { purpose: ticket.purpose };
  }

  /** Состояние тикета — это и есть ответ на «Я перешёл по ссылке». */
  async status(
    phoneAccountId: string,
    uuid: string,
  ): Promise<{
    id: string;
    purpose: EmailPurpose;
    email: string;
    status: VerificationStatus;
    expiresAt: Date;
  }> {
    const ticket = await this.tickets.findOne({
      where: { uuid, phoneAccountId },
    });
    if (!ticket) throw new NotFoundException('Подтверждение не найдено');

    return {
      id: ticket.uuid,
      purpose: ticket.purpose,
      email: ticket.email,
      status: this.statusOf(ticket),
      expiresAt: ticket.expiresAt,
    };
  }

  async assertConfirmed(
    phoneAccountId: string,
    uuid: string,
    purpose: EmailPurpose,
  ): Promise<void> {
    const ticket = await this.tickets.findOne({
      where: { uuid, phoneAccountId, purpose },
    });
    if (!ticket || this.statusOf(ticket) !== 'confirmed') {
      this.throwUnusable(ticket);
    }
  }

  async consume(
    manager: EntityManager,
    phoneAccountId: string,
    uuid: string,
    purpose: EmailPurpose,
  ): Promise<{ email: string }> {
    const result = await manager
      .createQueryBuilder()
      .update(EmailVerification)
      .set({ consumedAt: () => 'now()' })
      .where('uuid = :uuid', { uuid })
      .andWhere('phone_account_id = :phoneAccountId', { phoneAccountId })
      .andWhere('purpose = :purpose', { purpose })
      .andWhere('confirmed_at IS NOT NULL')
      .andWhere('consumed_at IS NULL')
      .andWhere('expires_at > now()')
      .returning('email')
      .execute();

    const row = (result.raw as { email?: string }[])[0];
    if (row?.email) return { email: row.email };

    // Ничего не обновилось — объясняем, что именно не так, а не «нельзя».
    const ticket = await manager
      .getRepository(EmailVerification)
      .findOne({ where: { uuid, phoneAccountId, purpose } });
    this.throwUnusable(ticket);
  }

  /** Единая формулировка отказа для assertConfirmed и consume. */
  private throwUnusable(ticket: EmailVerification | null): never {
    if (!ticket) {
      throw new BadRequestException(
        'Подтверждение не найдено. Запросите письмо заново.',
      );
    }
    switch (this.statusOf(ticket)) {
      case 'consumed':
        throw new ConflictException('Это подтверждение уже использовано');
      case 'expired':
        throw new BadRequestException(
          'Срок действия подтверждения истёк. Запросите письмо заново.',
        );
      default:
        throw new BadRequestException(
          'Мы ещё не увидели переход по ссылке. Откройте письмо и попробуйте снова.',
        );
    }
  }

  private statusOf(ticket: EmailVerification): VerificationStatus {
    if (ticket.consumedAt) return 'consumed';
    if (ticket.confirmedAt) return 'confirmed';
    if (ticket.expiresAt < new Date()) return 'expired';
    return 'pending';
  }

  private async resolveEmail(input: RequestVerificationInput): Promise<string> {
    if (input.purpose === EmailPurpose.CHANGE_EMAIL) {
      const email = input.email?.trim();
      if (!email) throw new BadRequestException('Укажите электронную почту');
      return normalizeEmail(email);
    }

    const user = await this.users.findOne({
      where: { phoneAccountId: input.phoneAccountId },
      relations: ['emailAccount'],
    });
    if (!user?.emailAccount) {
      throw new ConflictException('К аккаунту не привязана электронная почта');
    }
    if (
      PURPOSES_USING_ACCOUNT_EMAIL.has(input.purpose) &&
      !user.emailAccount.verifiedAt
    ) {
      throw new ConflictException(
        'Сначала подтвердите электронную почту в настройках профиля',
      );
    }
    return user.emailAccount.email;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
