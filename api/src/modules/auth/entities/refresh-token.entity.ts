import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { PhoneAccount } from '../../users/entities/phone-account.entity';
import { Session } from '../sessions/session.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ name: 'phone_account_id' })
  phoneAccountId!: string;

  @ManyToOne(() => PhoneAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'phone_account_id' })
  phoneAccount!: PhoneAccount;

  /**
   * Сеанс, которому принадлежит токен. Отзыв сеанса удаляет его токены
   * каскадом. NULL — только у токенов, выданных до появления сеансов:
   * такой токен на первом же refresh получает сеанс (см. AuthService.refresh).
   */
  @Index('idx_refresh_tokens_session')
  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId!: string | null;

  @ManyToOne(() => Session, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'session_id' })
  session!: Session | null;

  // SHA-256 от токена — в куке хранится сырой токен, в БД — хэш
  @Column({ name: 'token_hash', unique: true, length: 64 })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
