import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Subject } from 'rxjs';
import { EntityManager, LessThan, MoreThan, Repository } from 'typeorm';
import { describeDevice, SessionClient, USER_AGENT_MAX } from './device-info';
import { Session } from './session.entity';

/** Откуда пришёл запрос на вход или обновление токенов. */
export interface ClientContext {
  client: SessionClient;
  userAgent?: string;
}

export interface AccountSessions {
  current: Session;
  /** Остальные живые сеансы, свежие сверху. */
  others: Session[];
}

/**
 * Сколько guard доверяет прошлой проверке сеанса, не ходя в БД.
 *
 * Отзыв на этом же инстансе сбрасывает кэш сразу. На соседнем инстансе
 * (если API когда-нибудь масштабируют) отозванный access-токен проживёт ещё
 * не дольше этого окна — против 15 минут без проверки вовсе.
 */
const ACTIVE_CACHE_TTL_MS = 10_000;
/** Предохранитель от роста кэша: при переполнении просто начинаем заново. */
const ACTIVE_CACHE_LIMIT = 10_000;

const CURRENT_SESSION_REVOKE =
  'Этот сеанс завершается выходом из аккаунта, а не из списка устройств';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  /** id сеанса → до какого момента (ms) считаем его живым без запроса. */
  private readonly activeUntil = new Map<string, number>();
  private readonly revokedSubject = new Subject<readonly string[]>();

  /**
   * id отозванных сеансов. Подписчик — шлюз звонков: сокет живёт дольше
   * access-токена, и без этого отозванное устройство оставалось бы на линии.
   */
  readonly revoked$ = this.revokedSubject.asObservable();

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
  ) {}

  /** Новый сеанс на входе по коду (или при переходе старого токена на сеансы). */
  async open(
    phoneAccountId: string,
    context: ClientContext,
    expiresAt: Date,
    manager?: EntityManager,
  ): Promise<Session> {
    const repo = manager?.getRepository(Session) ?? this.sessionRepo;
    const { platform, deviceName } = describeDevice(
      context.userAgent,
      context.client,
    );
    const session = await repo.save(
      repo.create({
        phoneAccountId,
        client: context.client,
        platform,
        deviceName,
        userAgent: context.userAgent?.slice(0, USER_AGENT_MAX) ?? null,
        lastActiveAt: new Date(),
        expiresAt,
      }),
    );
    this.remember(session.id);
    return session;
  }

  /** Отметка активности при ротации токенов: двигаем и «последний вход», и срок. */
  async touch(sessionId: string, expiresAt: Date): Promise<void> {
    await this.sessionRepo.update(
      { id: sessionId },
      { lastActiveAt: new Date(), expiresAt },
    );
  }

  /** Проверка для guard'ов: сеанс не отозван и не истёк. */
  async isActive(sessionId: string): Promise<boolean> {
    const until = this.activeUntil.get(sessionId);
    if (until !== undefined && until > Date.now()) return true;

    const alive = await this.sessionRepo.exists({
      where: { id: sessionId, expiresAt: MoreThan(new Date()) },
    });
    if (alive) this.remember(sessionId);
    else this.activeUntil.delete(sessionId);
    return alive;
  }

  async list(
    phoneAccountId: string,
    currentId: string,
  ): Promise<AccountSessions> {
    const sessions = await this.sessionRepo.find({
      where: { phoneAccountId, expiresAt: MoreThan(new Date()) },
      order: { lastActiveAt: 'DESC' },
    });
    const current = sessions.find((s) => s.id === currentId);
    // Токен прошёл guard, а сеанса уже нет — его отозвали в эти секунды.
    if (!current) throw new UnauthorizedException('Сеанс завершён');
    return { current, others: sessions.filter((s) => s !== current) };
  }

  /** Завершить один чужой сеанс аккаунта. */
  async revoke(
    phoneAccountId: string,
    sessionId: string,
    currentId: string,
  ): Promise<void> {
    if (sessionId === currentId) {
      throw new BadRequestException(CURRENT_SESSION_REVOKE);
    }
    // phoneAccountId в условии — защита от отзыва чужого сеанса по угаданному id.
    const { affected } = await this.sessionRepo.delete({
      id: sessionId,
      phoneAccountId,
    });
    if (!affected) throw new NotFoundException('Сеанс не найден');
    this.forget([sessionId]);
  }

  /** «Выйти со всех устройств»: всё, кроме текущего сеанса. Возвращает число отозванных. */
  async revokeOthers(
    phoneAccountId: string,
    currentId: string,
  ): Promise<number> {
    // Одним DELETE … RETURNING: id нужны, чтобы отключить сокеты, а отдельный
    // SELECT перед удалением пропустил бы сеанс, открытый между запросами.
    const result = await this.sessionRepo
      .createQueryBuilder()
      .delete()
      .from(Session)
      .where('phone_account_id = :phoneAccountId', { phoneAccountId })
      .andWhere('id <> :currentId', { currentId })
      .returning('id')
      .execute();
    const ids = ((result.raw ?? []) as Array<{ id: string }>).map((r) => r.id);
    this.forget(ids);
    return ids.length;
  }

  /** Выход на этом устройстве: сеанс удаляется вместе с токенами. */
  async close(sessionId: string): Promise<void> {
    await this.sessionRepo.delete({ id: sessionId });
    this.forget([sessionId]);
  }

  /**
   * Протухшие сеансы (вход не обновлялся дольше срока refresh-токена).
   * Токены уходят каскадом. Отзывом это не считаем: access-токены таких
   * сеансов давно истекли, отключать некого.
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'sessions-cleanup' })
  async removeExpired(): Promise<void> {
    try {
      const { affected } = await this.sessionRepo.delete({
        expiresAt: LessThan(new Date()),
      });
      if (affected) this.logger.log(`Удалено истёкших сеансов: ${affected}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(`Очистка истёкших сеансов не удалась: ${reason}`);
    }
  }

  private remember(sessionId: string): void {
    if (this.activeUntil.size >= ACTIVE_CACHE_LIMIT) this.activeUntil.clear();
    this.activeUntil.set(sessionId, Date.now() + ACTIVE_CACHE_TTL_MS);
  }

  private forget(sessionIds: readonly string[]): void {
    if (sessionIds.length === 0) return;
    for (const id of sessionIds) this.activeUntil.delete(id);
    this.revokedSubject.next(sessionIds);
  }
}
