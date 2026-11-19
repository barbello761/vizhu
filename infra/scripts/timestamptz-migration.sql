-- ================================================================
-- timestamp → timestamptz для всех колонок схемы public
--
-- Сейчас это created_at в otp_codes, refresh_tokens, users, phone_accounts,
-- email_verifications, email_accounts, history_entries и users.updated_at —
-- то, что TypeORM создал из @CreateDateColumn / @UpdateDateColumn без типа.
-- Скрипт сам находит колонки по information_schema, руками список не ведём.
--
-- ПОРЯДОК ОБЯЗАТЕЛЕН:
--   1. Остановить api (docker compose stop api). Старый код с
--      synchronize: true на старте увидит «не тот тип» и пересоздаст колонку —
--      то есть удалит все даты.
--   2. Проверить пояс базы: SHOW timezone;  и поправить src_tz ниже, если не UTC.
--      Значения писались now() в поясе сессии api, а это пояс сервера Postgres.
--   3. Выполнить скрипт:
--      docker exec -i vizhu_postgres psql -U <user> -d <db> < infra/scripts/timestamptz-migration.sql
--   4. Задеплоить api, где в сущностях уже стоит type: 'timestamptz'.
--
-- Идемпотентен: повторный запуск ничего не найдёт и ничего не сделает.
-- ALTER TYPE переписывает таблицу под эксклюзивной блокировкой — на наших
-- объёмах это доли секунды, но делать при остановленном api всё равно надо.
-- ================================================================

\echo 'Колонки, которые будут сконвертированы:'
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'timestamp without time zone'
ORDER BY table_name, column_name;

BEGIN;

DO $$
DECLARE
  -- Пояс, в котором значения были ЗАПИСАНЫ (см. шаг 2).
  src_tz constant text := 'UTC';
  col record;
BEGIN
  FOR col IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'timestamp without time zone'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I TYPE timestamptz USING %I AT TIME ZONE %L',
      col.table_name, col.column_name, col.column_name, src_tz
    );
    RAISE NOTICE 'OK: %.%', col.table_name, col.column_name;
  END LOOP;
END $$;

COMMIT;

\echo 'Осталось колонок без пояса (должно быть 0):'
SELECT count(*)
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'timestamp without time zone';
