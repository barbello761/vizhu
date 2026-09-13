import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

@Entity('email_accounts')
@Index('UQ_email_accounts_verified_email', ['email'], {
  unique: true,
  where: '"verified_at" IS NOT NULL',
})
export class EmailAccount {
  @PrimaryColumn('uuid')
  uuid!: string;

  /** Всегда в нижнем регистре и без пробелов — нормализует EmailAccountsService. */
  @Column({ length: 320 })
  email!: string;

  /** null — письмо отправлено, но по ссылке ещё не перешли. */
  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @BeforeInsert()
  generateId() {
    if (!this.uuid) this.uuid = uuidv7();
  }
}

/** Единая нормализация адреса: сравнение и уникальность работают только по ней. */
export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();
