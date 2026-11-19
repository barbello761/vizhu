import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { PhoneAccount } from '../../users/entities/phone-account.entity';
import {
  DEVICE_NAME_MAX,
  DevicePlatform,
  SessionClient,
  USER_AGENT_MAX,
} from './device-info';

/**
 * Сеанс — один вход в аккаунт с одного устройства.
 *
 * Живёт от проверки кода до выхода, отзыва или простоя дольше срока жизни
 * refresh-токена. Сами refresh-токены ротируются на каждом обновлении и
 * ссылаются на сеанс (refresh_tokens.session_id, ON DELETE CASCADE): удалить
 * строку сеанса = разом погасить все его токены. Access-токен несёт id сеанса
 * в клейме `sid`, и guard отвергает его сразу после отзыва, не дожидаясь,
 * пока он истечёт сам.
 *
 * Отзыв — жёсткое удаление: истории сеансов продукт не показывает, а
 * «мягкие» строки пришлось бы фильтровать в каждом запросе.
 */
@Entity('sessions')
// Список сеансов аккаунта, свежие сверху — основной запрос таблицы.
@Index('idx_sessions_account_activity', ['phoneAccountId', 'lastActiveAt'])
// Ночная чистка протухших сеансов.
@Index('idx_sessions_expires_at', ['expiresAt'])
export class Session {
  // uuid v7: монотонный по времени, индекс не фрагментируется на вставках.
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'phone_account_id', type: 'uuid' })
  phoneAccountId!: string;

  @ManyToOne(() => PhoneAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'phone_account_id' })
  phoneAccount!: PhoneAccount;

  @Column({ type: 'varchar', length: 16 })
  client!: SessionClient;

  @Column({ type: 'varchar', length: 16, default: DevicePlatform.UNKNOWN })
  platform!: DevicePlatform;

  @Column({ name: 'device_name', type: 'varchar', length: DEVICE_NAME_MAX })
  deviceName!: string;

  /** Сырой UA: подпись можно будет переразобрать, когда парсер поумнеет. */
  @Column({
    name: 'user_agent',
    type: 'varchar',
    length: USER_AGENT_MAX,
    nullable: true,
  })
  userAgent!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  /** Последнее обновление токенов: запуск приложения или каждые ~15 минут работы. */
  @Column({ name: 'last_active_at', type: 'timestamptz' })
  lastActiveAt!: Date;

  /** Совпадает со сроком последнего выданного refresh-токена (скользящее окно). */
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv7();
  }
}
