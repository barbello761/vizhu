import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Call } from './call.entity';
import { CallRating, CallSide } from '../call.enums';

/**
 * Отзыв одной стороны звонка о другой: оценка и жалоба.
 *
 * Ключ — (звонок, сторона автора): одна сторона оставляет на звонок ровно
 * один отзыв. Автор задан стороной, а не id пользователя, поэтому ключ
 * никогда не бывает NULL — даже после удаления аккаунта известно, чей это
 * отзыв. Кто автор и кто адресат, выводится из самого звонка.
 *
 * Оценку и жалобу фронт отправляет с разных экранов и независимо друг от
 * друга, поэтому обе части необязательны и дописываются в одну строку —
 * каждая ровно один раз (rating IS NULL / reported_at IS NULL до записи).
 *
 * Жалобы наружу не отдаются никому из участников.
 */
@Entity('call_feedback')
export class CallFeedback {
  @PrimaryColumn({ name: 'call_id', type: 'uuid' })
  callId!: string;

  @PrimaryColumn({ name: 'author_side', type: 'enum', enum: CallSide })
  authorSide!: CallSide;

  @ManyToOne(() => Call, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'call_id' })
  call!: Call;

  /** null — участник пожаловался, но оценку не поставил. */
  @Column({ type: 'enum', enum: CallRating, nullable: true })
  rating!: CallRating | null;

  /** null — жалобы нет; флаги ниже имеют смысл только при заполненном поле. */
  @Column({ name: 'reported_at', type: 'timestamptz', nullable: true })
  reportedAt!: Date | null;

  // Причины жалобы — повторяют ReportSchema на фронте.
  @Column({ name: 'not_helpful', default: false })
  notHelpful!: boolean;

  @Column({ default: false })
  rude!: boolean;

  @Column({ name: 'privacy_intruder', default: false })
  privacyIntruder!: boolean;

  @Column({ type: 'varchar', length: 200, nullable: true })
  other!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
