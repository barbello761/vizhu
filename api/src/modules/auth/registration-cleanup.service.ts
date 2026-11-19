import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';

import { OtpCode } from './otp-code.entity';

/**
 * Сколько живёт номер без профиля. Отсчёт — от последней активности, а не от
 * создания: refresh-токен выпускается на каждом входе и запуске приложения,
 * так что человек, который прямо сейчас проходит регистрацию, под чистку не
 * попадёт, даже если номер заведён давно.
 */
const ABANDONED_AFTER = '24 hours';

/**
 * Номера с брошенной регистрацией.
 *
 * phone_accounts заводится на первом проверенном коде, а профиль (users) —
 * только в конце регистрации. Бросили посередине — остаётся номер без профиля.
 * Войти по нему можно (verify-otp вернёт isNewUser и регистрация начнётся
 * заново), но копить такие записи незачем: в них нет ничего, кроме номера.
 *
 * Одним запросом, чтобы выборка и удаление видели одно и то же состояние.
 * SKIP LOCKED — на случай нескольких инстансов API: второй просто пропустит
 * строки, которые уже чистит первый. refresh_tokens и email_verifications
 * уходят каскадом по FK; у history_entries внешнего ключа нет (анонимные
 * разборы фото пишутся без аккаунта), её чистим явно. Колонка там varchar,
 * отсюда приведение uuid::text.
 */
const DELETE_ABANDONED_SQL = `
  WITH stale AS (
    SELECT pa.uuid
    FROM phone_accounts pa
    WHERE pa.created_at < now() - interval '${ABANDONED_AFTER}'
      AND NOT EXISTS (SELECT 1 FROM users u WHERE u.phone_account_id = pa.uuid)
      AND NOT EXISTS (
        SELECT 1 FROM refresh_tokens rt
        WHERE rt.phone_account_id = pa.uuid
          AND rt.created_at > now() - interval '${ABANDONED_AFTER}'
      )
    FOR UPDATE OF pa SKIP LOCKED
  ),
  history AS (
    DELETE FROM history_entries
    WHERE phone_account_id IN (SELECT uuid::text FROM stale)
  )
  DELETE FROM phone_accounts
  WHERE uuid IN (SELECT uuid FROM stale)
  RETURNING uuid
`;

@Injectable()
export class RegistrationCleanupService {
  private readonly logger = new Logger(RegistrationCleanupService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(OtpCode) private readonly otpRepo: Repository<OtpCode>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'registration-cleanup' })
  async run(): Promise<void> {
    try {
      const removed = await this.removeAbandonedPhones();
      // Протухшие коды удаляются только при повторном запросе на тот же номер —
      // по номерам, куда больше не входили, они копились бы вечно.
      await this.otpRepo.delete({ expiresAt: LessThan(new Date()) });
      if (removed > 0) {
        this.logger.log(`Удалено номеров с брошенной регистрацией: ${removed}`);
      }
    } catch (err) {
      // Крон не должен ронять процесс: попробуем через час.
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(`Очистка брошенных регистраций не удалась: ${reason}`);
    }
  }

  async removeAbandonedPhones(): Promise<number> {
    const rows: unknown = await this.dataSource.query(DELETE_ABANDONED_SQL);
    // pg на DELETE … RETURNING отдаёт [rows, count]; проверяем форму, а не верим.
    if (Array.isArray(rows) && Array.isArray(rows[0])) {
      return rows[0].length;
    }
    return Array.isArray(rows) ? rows.length : 0;
  }
}
