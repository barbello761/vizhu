import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CallStatus, CallEndedBy } from '../call.enums';

/**
 * Постоянная запись о звонке. Состояние матчинга живёт отдельно (память или
 * Redis) и исчезает после соединения — история и жалобы опираются только на
 * эту таблицу.
 *
 * Имя LiveKit-комнаты не хранится: оно всегда `call_${id}`, по нему же
 * вебхуки LiveKit находят запись. Длительность считается при чтении как
 * `ended_at - accepted_at`.
 */
@Entity('calls')
@Index('IDX_calls_blind_requested', ['blindUserId', 'requestedAt'])
@Index('IDX_calls_volunteer_requested', ['volunteerUserId', 'requestedAt'])
// Обычный, а не частичный (WHERE status IN …): условие с литералами enum
// ломает synchronize при любом изменении CallStatus — TypeORM пересоздаёт
// тип, и Postgres не может сравнить новый enum со старым в предикате индекса.
@Index('IDX_calls_status', ['status'])
export class Call {
  /** Совпадает с requestId из матчинга, поэтому не генерируется базой. */
  @PrimaryColumn('uuid')
  id!: string;

  /** null только после удаления аккаунта — сама запись остаётся ради жалоб. */
  @Column({ name: 'blind_user_id', type: 'uuid', nullable: true })
  blindUserId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'blind_user_id' })
  blindUser!: User | null;

  /** null, пока звонок никто не принял. */
  @Column({ name: 'volunteer_user_id', type: 'uuid', nullable: true })
  volunteerUserId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'volunteer_user_id' })
  volunteerUser!: User | null;

  @Column({ type: 'enum', enum: CallStatus, default: CallStatus.SEARCHING })
  status!: CallStatus;

  @Column({
    name: 'ended_by',
    type: 'enum',
    enum: CallEndedBy,
    nullable: true,
  })
  endedBy!: CallEndedBy | null;

  /** Сколько волонтёров обзвонили, пока кто-то не ответил. */
  @Column({ name: 'ring_attempts', type: 'smallint', default: 0 })
  ringAttempts!: number;

  @Column({ name: 'requested_at', type: 'timestamptz', default: () => 'now()' })
  requestedAt!: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;
}
