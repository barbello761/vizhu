import { env } from '@/shared/config';

/** Сколько ждём ответа на пинг: дольше — считаем, что сервера нет. */
const PING_TIMEOUT_MS = 5000;

export type PingResult = { ok: true } | { ok: false; code: string };

/**
 * Пульс сервера: GET /health/ping отвечает 200, только если API живо и
 * достаёт до базы.
 *
 * Через fetch, а не через общий axios-инстанс: тот на сетевых ошибках сам
 * запускает проверку связи (вышла бы рекурсия), умеет обновлять токен и
 * подставляет авторизацию — пингу ничего из этого не нужно. `no-store` — чтобы
 * ни HTTP-кэш, ни сервис-воркер не ответили за сервер «всё хорошо».
 */
export const pingServer = async (): Promise<PingResult> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const response = await fetch(`${env.apiUrl}/health/ping`, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    });
    return response.ok ? { ok: true } : { ok: false, code: String(response.status) };
  } catch {
    return { ok: false, code: controller.signal.aborted ? 'TIMEOUT' : 'ERR_NETWORK' };
  } finally {
    clearTimeout(timer);
  }
};
