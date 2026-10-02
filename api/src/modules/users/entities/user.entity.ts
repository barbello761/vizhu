import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PhoneAccount } from './phone-account.entity';
import { EmailAccount } from './email-account.entity';
import { UserRole } from '../user-role.enum';
import { UserStatus } from '../user-status.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ name: 'phone_account_id', unique: true })
  phoneAccountId!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.BLIND,
  })
  role!: UserRole;

  @OneToOne(() => PhoneAccount)
  @JoinColumn({ name: 'phone_account_id' })
  phoneAccount!: PhoneAccount;

  @Column({
    name: 'email_account_id',
    unique: true,
    nullable: true,
    type: 'uuid',
  })
  emailAccountId!: string | null;

  @OneToOne(() => EmailAccount, { nullable: true })
  @JoinColumn({ name: 'email_account_id' })
  emailAccount!: EmailAccount | null;

  @Column({ length: 255 })
  name!: string;

  @Column({ name: 'is_verified', default: false })
  isVerified!: boolean;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  /**
   * Когда модератор последний раз разобрал жалобы на пользователя. Порог
   * under_review считает только жалобы после этой даты, поэтому тот, кто
   * возвращает пользователю active, обязан проставить сюда now().
   * null — ни разу не проверяли, считаются все жалобы.
   */
  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  /**
   * Счётчики оценок, полученных от собеседников после звонков.
   *
   * Это кэш: источник правды — `call_feedback`, счётчики увеличиваются в той
   * же транзакции, что и вставка оценки, и при расхождении пересобираются
   * одним GROUP BY по ней. Итоговый балл считается из них при чтении, поэтому
   * формулу можно менять без миграции.
   */
  @Column({ name: 'rating_bad', type: 'int', default: 0 })
  ratingBad!: number;

  @Column({ name: 'rating_neutral', type: 'int', default: 0 })
  ratingNeutral!: number;

  @Column({ name: 'rating_good', type: 'int', default: 0 })
  ratingGood!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
