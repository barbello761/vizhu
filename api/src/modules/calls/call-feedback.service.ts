import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserStatus } from '../users/user-status.enum';
import { CallRating, CallSide, CallStatus } from './call.enums';
import { Call } from './entities/call.entity';

export interface CallReportReasons {
  notHelpful: boolean;
  rude: boolean;
  privacyIntruder: boolean;
  other: string | null;
}

const RATING_COUNTER = {
  [CallRating.BAD]: 'ratingBad',
  [CallRating.NEUTRAL]: 'ratingNeutral',
  [CallRating.GOOD]: 'ratingGood',
} as const satisfies Record<CallRating, keyof User>;

/** После стольких жалоб аккаунт снимается на проверку модератором. */
const COMPLAINTS_REVIEW_THRESHOLD = 10;

/**
 * Оценки и жалобы по итогам звонка.
 *
 * Строка `call_feedback` одна на сторону звонка; оценка и жалоба
 * дописываются в неё независимо, каждая один раз. Проверка «уже было» и
 * запись идут одним INSERT … ON CONFLICT DO UPDATE … WHERE, поэтому два
 * одновременных запроса не проскочат оба.
 */
@Injectable()
export class CallFeedbackService {
  private readonly logger = new Logger(CallFeedbackService.name);

  constructor(
    @InjectRepository(Call) private readonly calls: Repository<Call>,
  ) {}

  async rate(
    callId: string,
    authorUserId: string,
    rating: CallRating,
  ): Promise<void> {
    const { authorSide, targetUserId } = await this.participation(
      callId,
      authorUserId,
    );

    await this.calls.manager.transaction(async (manager) => {
      const written: unknown[] = await manager.query(
        `INSERT INTO call_feedback (call_id, author_side, rating)
         VALUES ($1, $2, $3)
         ON CONFLICT (call_id, author_side)
           DO UPDATE SET rating = EXCLUDED.rating
           WHERE call_feedback.rating IS NULL
         RETURNING call_id`,
        [callId, authorSide, rating],
      );
      if (written.length === 0) {
        throw new ConflictException('Звонок уже оценён');
      }
      // Собеседник мог удалить аккаунт — оценка остаётся, счётчик некому.
      if (targetUserId) {
        await manager.increment(
          User,
          { uuid: targetUserId },
          RATING_COUNTER[rating],
          1,
        );
      }
    });
  }

  async report(
    callId: string,
    authorUserId: string,
    reasons: CallReportReasons,
  ): Promise<void> {
    const { authorSide, targetUserId } = await this.participation(
      callId,
      authorUserId,
    );

    const written: unknown[] = await this.calls.manager.query(
      `INSERT INTO call_feedback
         (call_id, author_side,
          not_helpful, rude, privacy_intruder, other, reported_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (call_id, author_side)
         DO UPDATE SET not_helpful = EXCLUDED.not_helpful,
                       rude = EXCLUDED.rude,
                       privacy_intruder = EXCLUDED.privacy_intruder,
                       other = EXCLUDED.other,
                       reported_at = EXCLUDED.reported_at
         WHERE call_feedback.reported_at IS NULL
       RETURNING call_id`,
      [
        callId,
        authorSide,
        reasons.notHelpful,
        reasons.rude,
        reasons.privacyIntruder,
        reasons.other,
      ],
    );
    if (written.length === 0) {
      throw new ConflictException('Жалоба на этот звонок уже отправлена');
    }
    // Собеседник мог удалить аккаунт — жалоба остаётся, проверять некого.
    if (targetUserId) await this.reviewIfTooManyComplaints(targetUserId);
  }

  /**
   * Счётчик жалоб нигде не хранится — он считается по call_feedback только
   * здесь, при новой жалобе. Жалобы на пользователя — это жалобы стороны,
   * противоположной той, за которую он был в звонке.
   *
   * Считаются только жалобы после последней проверки (users.reviewed_at):
   * иначе оправданный модератором пользователь уходил бы на проверку снова
   * с первой же новой жалобой — старые-то никуда не делись.
   *
   * Переводим только из active: заблокированного модератором не
   * «разблокируем» до under_review. Две жалобы, одновременно добившие
   * порог, дадут один и тот же результат.
   */
  private async reviewIfTooManyComplaints(userId: string): Promise<void> {
    const [{ complaints }] = await this.calls.manager.query<
      [{ complaints: number }]
    >(
      `WITH since AS (
         SELECT COALESCE(reviewed_at, '-infinity'::timestamptz) AS t
           FROM users WHERE uuid = $1
       )
       SELECT ((
         SELECT count(*) FROM since, calls c
           JOIN call_feedback f ON f.call_id = c.id AND f.author_side = 'blind'
          WHERE c.volunteer_user_id = $1 AND f.reported_at > since.t
       ) + (
         SELECT count(*) FROM since, calls c
           JOIN call_feedback f ON f.call_id = c.id AND f.author_side = 'volunteer'
          WHERE c.blind_user_id = $1 AND f.reported_at > since.t
       ))::int AS complaints`,
      [userId],
    );
    if (complaints < COMPLAINTS_REVIEW_THRESHOLD) return;

    const { affected } = await this.calls.manager.update(
      User,
      { uuid: userId, status: UserStatus.ACTIVE },
      { status: UserStatus.UNDER_REVIEW },
    );
    if (affected) {
      this.logger.warn(
        `user ${userId} sent to review: ${complaints} complaints`,
      );
    }
  }

  /**
   * Сторона автора в звонке и id собеседника. Оставить отзыв можно только о состоявшемся
   * разговоре и только его участнику — для всех остальных звонка «нет»,
   * чтобы по ответу нельзя было проверить чужой id.
   *
   * Статус active тоже подходит: фронт открывает экран оценки сразу после
   * выхода, а LiveKit закрывает комнату с задержкой.
   */
  private async participation(
    callId: string,
    authorUserId: string,
  ): Promise<{ authorSide: CallSide; targetUserId: string | null }> {
    const call = await this.calls.findOne({
      where: [
        {
          id: callId,
          blindUserId: authorUserId,
          status: In([CallStatus.ACTIVE, CallStatus.FINISHED]),
        },
        {
          id: callId,
          volunteerUserId: authorUserId,
          status: In([CallStatus.ACTIVE, CallStatus.FINISHED]),
        },
      ],
    });
    if (!call) throw new NotFoundException('Звонок не найден');
    return call.blindUserId === authorUserId
      ? { authorSide: CallSide.BLIND, targetUserId: call.volunteerUserId }
      : { authorSide: CallSide.VOLUNTEER, targetUserId: call.blindUserId };
  }
}
