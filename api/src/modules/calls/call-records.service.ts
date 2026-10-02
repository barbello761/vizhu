import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { CallsService } from './calls.service';
import { CallEndedBy, CallStatus } from './call.enums';
import { roomForCall } from './call-room';
import { Call } from './entities/call.entity';

/**
 * Постоянная запись о звонках: матчинг и вебхуки LiveKit сообщают сюда о
 * событиях, а сервис переводит строку `calls` по статусам.
 *
 * Все переходы — условные UPDATE (`WHERE status = …`): инстансов api может
 * быть несколько, события могут прийти повторно или не по порядку, и ни одно
 * из них не должно откатить звонок назад.
 */
@Injectable()
export class CallRecordsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CallRecordsService.name);
  private reconcileTimer?: NodeJS.Timeout;

  private readonly RECONCILE_INTERVAL_MS = 30_000;
  private readonly RECONCILE_BATCH = 100;

  constructor(
    @InjectRepository(Call) private readonly repo: Repository<Call>,
    private readonly calls: CallsService,
  ) {}

  onModuleInit(): void {
    this.reconcileTimer = setInterval(
      () => void this.reconcile(),
      this.RECONCILE_INTERVAL_MS,
    );
  }

  onModuleDestroy(): void {
    if (this.reconcileTimer) clearInterval(this.reconcileTimer);
  }

  /**
   * Новый запрос помощи. Матчинг зовёт это только когда у незрячего нет ни
   * очереди, ни дозвона, поэтому его незакрытые поиски — остатки рестарта,
   * и их можно погасить.
   */
  async open(callId: string, blindUserId: string): Promise<void> {
    await this.repo.update(
      { blindUserId, status: CallStatus.SEARCHING, id: Not(callId) },
      { status: CallStatus.CANCELLED, endedAt: new Date() },
    );
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(Call)
      .values({ id: callId, blindUserId })
      .orIgnore()
      .execute();
  }

  async ringStarted(callId: string): Promise<void> {
    await this.repo.increment(
      { id: callId, status: CallStatus.SEARCHING },
      'ringAttempts',
      1,
    );
  }

  async accepted(callId: string, volunteerUserId: string): Promise<void> {
    await this.repo.update(
      { id: callId, status: CallStatus.SEARCHING },
      { status: CallStatus.ACTIVE, volunteerUserId, acceptedAt: new Date() },
    );
  }

  /** Незрячий ушёл до соединения (его вычистили после grace). */
  async cancelSearchesOf(blindUserId: string): Promise<void> {
    await this.repo.update(
      { blindUserId, status: CallStatus.SEARCHING },
      { status: CallStatus.CANCELLED, endedAt: new Date() },
    );
  }

  /**
   * Участник вышел из комнаты. Запоминаем только первого вышедшего — это и
   * есть конец разговора; сама комната закроется позже (room_finished).
   */
  async participantLeft(callId: string, identity: string): Promise<void> {
    const side = await this.sideOf(callId, identity);
    if (!side) return;
    await this.repo.update(
      { id: callId, status: CallStatus.ACTIVE, endedBy: IsNull() },
      { endedBy: side, endedAt: new Date() },
    );
  }

  /**
   * Участник снова вошёл. Если это тот, кто «завершил» звонок, — это был
   * реконнект (перезагрузка приложения), и разговор продолжается.
   */
  async participantJoined(callId: string, identity: string): Promise<void> {
    const side = await this.sideOf(callId, identity);
    if (!side) return;
    await this.repo.update(
      { id: callId, status: CallStatus.ACTIVE, endedBy: side },
      { endedBy: null, endedAt: null },
    );
  }

  /** Комната закрылась. Если никто не успел «выйти первым» — закрыл сервер. */
  async finish(callId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Call)
      .set({
        status: CallStatus.FINISHED,
        endedAt: () => 'COALESCE(ended_at, now())',
        endedBy: () => `COALESCE(ended_by, '${CallEndedBy.SYSTEM}')`,
      })
      .where('id = :callId AND status = :status', {
        callId,
        status: CallStatus.ACTIVE,
      })
      .execute();
  }

  /**
   * Страховка от потерянных вебхуков (api лежал, вебхуки не настроены):
   * активный звонок, чьей комнаты в LiveKit уже нет, считается завершённым.
   */
  private async reconcile(): Promise<void> {
    try {
      const open = await this.repo.find({
        select: { id: true },
        where: { status: CallStatus.ACTIVE },
        take: this.RECONCILE_BATCH,
      });
      if (open.length === 0) return;
      const alive = await this.calls.existingRooms(
        open.map((call) => roomForCall(call.id)),
      );
      for (const call of open) {
        if (!alive.has(roomForCall(call.id))) await this.finish(call.id);
      }
    } catch (error) {
      this.logger.error(
        `calls reconcile failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async sideOf(
    callId: string,
    identity: string,
  ): Promise<CallEndedBy | undefined> {
    const call = await this.repo.findOne({
      select: { id: true, blindUserId: true, volunteerUserId: true },
      where: { id: callId },
    });
    if (!call) return undefined;
    if (identity === call.blindUserId) return CallEndedBy.BLIND;
    if (identity === call.volunteerUserId) return CallEndedBy.VOLUNTEER;
    return undefined;
  }
}
