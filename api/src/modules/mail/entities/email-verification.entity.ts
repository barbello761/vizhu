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
import { EmailPurpose } from '../email-purpose.enum';

@Entity('email_verifications')
@Index(['phoneAccountId', 'purpose'])
export class EmailVerification {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  /** Владелец тикета = sub из JWT. Действие выполнится только для него. */
  @Column({ name: 'phone_account_id' })
  phoneAccountId!: string;

  @ManyToOne(() => PhoneAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'phone_account_id' })
  phoneAccount!: PhoneAccount;

  @Column({ type: 'enum', enum: EmailPurpose })
  purpose!: EmailPurpose;

  /** Адрес, на который ушло письмо. Для CHANGE_EMAIL — новый адрес. */
  @Column({ length: 320 })
  email!: string;

  @Column({ name: 'token_hash', unique: true, length: 64 })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt!: Date | null;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
