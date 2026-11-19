import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Server } from 'socket.io';
import { UserRole } from '../users/user-role.enum';
import { CallsService } from './calls.service';
import {
  MATCHING_STORE,
  type ActiveRing,
  type MatchInfo,
  type MatchingStore,
  type PendingRequest,
} from './matching.store';

/**
 * Почему волонтёру отменили входящий (payload `call:cancelled`):
 * - withdrawn — незрячий отменил вызов или пропал из сети;
 * - missed    — волонтёр не ответил за RING_TIMEOUT_MS, и мы сняли его с линии,
 *               чтобы следующие незрячие не ждали дозвона в «мёртвый» телефон;
 * - failed    — не удалось создать комнату LiveKit.
 */
export type CancelReason = 'withdrawn' | 'missed' | 'failed';

export interface CallCancelledPayload {
  requestId: string;
  reason: CancelReason;
}

@Injectable()
export class MatchingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MatchingService.name);
  private server!: Server;
  private sweepTimer?: NodeJS.Timeout;
  /**
   * Все команды матчинга выполняются строго по одной. Каждая — цепочка
   * await-ов к хранилищу, и без очереди они переплетались: два call:request
   * от одного незрячего проходили проверку «запроса ещё нет» одновременно и
   * звонили двум волонтёрам сразу, а volunteer:online, пришедший между
   * «свободных нет» и «встаём в очередь», терял незрячего в очереди при
   * свободном волонтёре. Нагрузка у матчинга — единицы событий в секунду,
   * так что последовательное выполнение ничего не стоит.
   */
  private queue: Promise<unknown> = Promise.resolve();
  private sweeping = false;

  private readonly RING_TIMEOUT_MS = 20_000;
  private readonly GRACE_MS = 12_000;
  private readonly MATCH_KEEP_SECONDS = 60;
  private readonly SWEEP_INTERVAL_MS = 1_000;

  constructor(
    private readonly calls: CallsService,
    @Inject(MATCHING_STORE) private readonly store: MatchingStore,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.store.initialize();
    await this.runSweep();
    this.sweepTimer = setInterval(() => {
      // Хранилище притормозило — не копим тики в очереди команд.
      if (this.sweeping) return;
      this.sweeping = true;
      void this.runSweep().finally(() => {
        this.sweeping = false;
      });
    }, this.SWEEP_INTERVAL_MS);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    await this.store.close();
  }

  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  bindServer(server: Server): void {
    this.server = server;
  }

  async isStoreReady(): Promise<boolean> {
    return this.store.isReady();
  }

  /**
   * Свободные волонтёры — общий пул хранилища, поэтому число верное при
   * любом количестве инстансов API (с MATCHING_BACKEND=redis).
   */
  async availableCount(): Promise<number> {
    return this.store.countAvailableVolunteers();
  }

  private async emitToUser(
    userId: string,
    event: string,
    payload?: unknown,
  ): Promise<void> {
    const socketId = await this.store.getOnlineSocket(userId);
    if (socketId) this.server.to(socketId).emit(event, payload);
  }

  userConnected(userId: string, socketId: string): Promise<void> {
    return this.exclusive(async () => {
      await this.store.setOnlineSocket(userId, socketId);
      if (await this.store.cancelGrace(userId))
        this.logger.log(`reconnected within grace: ${userId}`);
    });
  }

  resume(userId: string): Promise<void> {
    return this.exclusive(async () => {
      const match = await this.store.getMatch(userId);
      if (match) {
        await this.emitToUser(userId, 'call:matched', match);
        this.logger.log(`match redelivered to ${userId} (${match.room})`);
      }
    });
  }

  /**
   * Активный матч пользователя — для перевыпуска LiveKit-токена. Токен
   * выдаётся только в комнату, куда матчинг сам свёл этого пользователя.
   */
  getActiveMatch(userId: string): Promise<MatchInfo | undefined> {
    return this.store.getMatch(userId);
  }

  volunteerOffline(volunteerId: string): Promise<void> {
    return this.exclusive(async () => {
      await this.store.removeAvailableVolunteer(volunteerId);
      await this.store.deleteMatch(volunteerId);
      const ring = await this.store.findRingByVolunteer(volunteerId);
      if (ring) {
        const taken = await this.store.takeRing(ring.requestId);
        if (taken) await this.retry(this.toPending(taken));
      }
      this.logger.log(`volunteer offline: ${volunteerId}`);
    });
  }

  userDisconnected(userId: string, socketId: string): Promise<void> {
    return this.exclusive(async () => {
      if ((await this.store.getOnlineSocket(userId)) !== socketId) return;
      await this.store.startGrace(userId, Date.now() + this.GRACE_MS);
      this.logger.log(`disconnect, grace started: ${userId}`);
    });
  }

  volunteerOnline(volunteerId: string): Promise<void> {
    return this.exclusive(async () => {
      await this.store.deleteMatch(volunteerId);
      // Волонтёру сейчас звонят (повторный online после реконнекта) — в пул
      // не возвращаем, иначе ему прилетел бы второй входящий поверх первого.
      if (await this.store.findRingByVolunteer(volunteerId)) return;
      await this.store.addAvailableVolunteer(volunteerId);
      this.logger.log(`volunteer online: ${volunteerId}`);
      await this.drainQueue();
    });
  }

  requestHelp(blindUserId: string): Promise<void> {
    return this.exclusive(async () => {
      await this.store.deleteMatch(blindUserId);
      // Запрос уже идёт (клиент перезаявился после реконнекта) — второй не
      // создаём, но напоминаем текущий статус: новый сокет его не слышал.
      if (await this.store.hasPendingByBlindUser(blindUserId)) {
        await this.emitToUser(blindUserId, 'call:waiting');
        return;
      }
      if (await this.store.findRingByBlindUser(blindUserId)) {
        await this.emitToUser(blindUserId, 'call:searching');
        return;
      }
      await this.retry({ requestId: randomUUID(), blindUserId });
    });
  }

  /**
   * Незрячий отменил вызов. Раньше явной отмены не было — клиент просто рвал
   * сокет, и ещё 12 секунд grace-окна запрос жил: волонтёру продолжал звонить
   * вызов, которого уже нет, а встающий на линию получал «фантомный» входящий.
   */
  cancelRequest(blindUserId: string): Promise<void> {
    return this.exclusive(async () => {
      await this.store.removePendingByBlindUser(blindUserId);
      await this.store.deleteMatch(blindUserId);
      const ring = await this.store.findRingByBlindUser(blindUserId);
      if (ring) {
        const taken = await this.store.takeRing(ring.requestId);
        if (taken) await this.releaseVolunteer(taken, 'withdrawn');
      }
      this.logger.log(`request cancelled by ${blindUserId}`);
    });
  }

  accept(requestId: string, volunteerId: string): Promise<void> {
    return this.exclusive(() => this.doAccept(requestId, volunteerId));
  }

  decline(requestId: string, volunteerId: string): Promise<void> {
    return this.exclusive(async () => {
      const ring = await this.store.getRing(requestId);
      if (!ring || ring.volunteerId !== volunteerId) return;
      const taken = await this.store.takeRing(requestId);
      if (!taken) return;
      // Сначала ищем незрячему другого волонтёра и только потом возвращаем
      // отказавшегося в пул — иначе тот же вызов тут же прилетел бы ему снова.
      // Раньше отказавшийся не возвращался вовсе: на экране «Вы на линии»,
      // а звонки больше не приходили.
      await this.retry(this.toPending(taken));
      await this.store.addAvailableVolunteer(volunteerId);
    });
  }

  private async doAccept(
    requestId: string,
    volunteerId: string,
  ): Promise<void> {
    const ring = await this.store.getRing(requestId);
    if (!ring || ring.volunteerId !== volunteerId) return;
    const taken = await this.store.takeRing(requestId);
    if (!taken) return;

    try {
      await this.calls.ensureRoom(taken.room);
      const volunteerToken = await this.calls.createToken({
        room: taken.room,
        identity: volunteerId,
        role: UserRole.VOLUNTEER,
      });
      const blindToken = await this.calls.createToken({
        room: taken.room,
        identity: taken.blindUserId,
        role: UserRole.BLIND,
      });
      await this.deliverMatch(volunteerId, volunteerToken);
      await this.deliverMatch(taken.blindUserId, blindToken);
      this.logger.log(
        `matched ${taken.blindUserId} <-> ${volunteerId} in ${taken.room}`,
      );
    } catch (error) {
      this.logger.error(
        `accept failed for ${taken.requestId} (${taken.room}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // Незрячему отдельное событие не нужно: retry сам пришлёт ему
      // searching/waiting. Раньше он получал call:cancelled и выпадал в idle,
      // хотя поиск продолжался.
      await this.emitToUser(volunteerId, 'call:cancelled', {
        requestId: taken.requestId,
        reason: 'failed',
      } satisfies CallCancelledPayload);
      await this.retry(this.toPending(taken));
      await this.store.addAvailableVolunteer(volunteerId);
    }
  }

  private async deliverMatch(userId: string, match: MatchInfo): Promise<void> {
    await this.store.putMatch(userId, match, this.MATCH_KEEP_SECONDS);
    await this.emitToUser(userId, 'call:matched', match);
  }

  private async startRing(
    request: PendingRequest,
    volunteerId: string,
  ): Promise<void> {
    const ring: ActiveRing = {
      ...request,
      volunteerId,
      room: `call_${request.requestId}`,
      deadlineAt: Date.now() + this.RING_TIMEOUT_MS,
    };
    await this.store.putRing(ring);
    await this.emitToUser(volunteerId, 'call:incoming', {
      requestId: request.requestId,
      blindUserId: request.blindUserId,
    });
    await this.emitToUser(request.blindUserId, 'call:searching');
  }

  private async retry(request: PendingRequest): Promise<void> {
    const volunteerId = await this.store.takeAvailableVolunteer();
    if (!volunteerId) {
      await this.store.enqueuePending(request);
      await this.emitToUser(request.blindUserId, 'call:waiting');
      return;
    }
    await this.startRing(request, volunteerId);
  }

  /** Звонок волонтёру снят не по его вине — сообщаем и возвращаем в пул. */
  private async releaseVolunteer(
    ring: ActiveRing,
    reason: CancelReason,
  ): Promise<void> {
    await this.emitToUser(ring.volunteerId, 'call:cancelled', {
      requestId: ring.requestId,
      reason,
    } satisfies CallCancelledPayload);
    await this.store.addAvailableVolunteer(ring.volunteerId);
    await this.drainQueue();
  }

  private async drainQueue(): Promise<void> {
    for (;;) {
      const volunteerId = await this.store.takeAvailableVolunteer();
      if (!volunteerId) return;
      const request = await this.store.dequeuePending();
      if (!request) {
        await this.store.addAvailableVolunteer(volunteerId);
        return;
      }
      await this.startRing(request, volunteerId);
    }
  }

  private runSweep(): Promise<void> {
    return this.exclusive(async () => {
      try {
        const now = Date.now();
        for (const ring of await this.store.takeExpiredRings(now)) {
          this.logger.log(`ring timeout: ${ring.requestId}`);
          // Волонтёр не ответил. Раньше ему ничего не сообщали: оверлей
          // входящего звенел бесконечно, а сам волонтёр молча выпадал из
          // пула, продолжая видеть «Вы на линии». Теперь снимаем с линии явно.
          await this.emitToUser(ring.volunteerId, 'call:cancelled', {
            requestId: ring.requestId,
            reason: 'missed',
          } satisfies CallCancelledPayload);
          await this.retry(this.toPending(ring));
        }
        for (const userId of await this.store.takeExpiredGrace(now))
          await this.purge(userId);
      } catch (error) {
        this.logger.error(
          `matching sweep failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  private async purge(userId: string): Promise<void> {
    await this.store.removeOnlineSocket(userId);
    await this.store.removeAvailableVolunteer(userId);
    await this.store.deleteMatch(userId);
    await this.store.removePendingByBlindUser(userId);

    const blindRing = await this.store.findRingByBlindUser(userId);
    if (blindRing) {
      const taken = await this.store.takeRing(blindRing.requestId);
      if (taken) await this.releaseVolunteer(taken, 'withdrawn');
    }
    const volunteerRing = await this.store.findRingByVolunteer(userId);
    if (volunteerRing) {
      const taken = await this.store.takeRing(volunteerRing.requestId);
      if (taken) await this.retry(this.toPending(taken));
    }
    await this.drainQueue();
    this.logger.log(`purged: ${userId}`);
  }

  private toPending(ring: ActiveRing): PendingRequest {
    return { requestId: ring.requestId, blindUserId: ring.blindUserId };
  }
}
