import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export type RequestType = 'describe' | 'currency' | 'ocr' | 'volunteer';

export interface HistoryMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

@Entity('history_entries')
export class HistoryEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'phone_account_id', type: 'varchar', nullable: true })
  phoneAccountId!: string | null;

  @Column({ type: 'enum', enum: ['describe', 'currency', 'ocr', 'volunteer'] })
  type!: RequestType;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'jsonb', default: [] })
  messages!: HistoryMessage[];

  /**
   * Время последней реплики в диалоге — по нему список истории и сортируется,
   * поэтому запись с новым сообщением поднимается наверх.
   *
   * Отдельная колонка, а не `@UpdateDateColumn`: переименование записи тоже
   * пишет строку, но всплывать от него запись не должна.
   *
   * Nullable ради записей, созданных до появления колонки: для них порядок
   * задаёт `created_at` (см. COALESCE в HistoryService.findByUser).
   */
  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
