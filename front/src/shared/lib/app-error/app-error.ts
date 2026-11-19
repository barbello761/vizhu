import axios from 'axios';

/**
 * Что пошло не так — с точки зрения человека, а не стека:
 * - `offline` — у устройства нет сети;
 * - `server-unreachable` — сеть есть, но сервер не отвечает (обрыв, таймаут,
 *   502/503/504 от прокси);
 * - `server` — сервер ответил, но упал сам (5xx);
 * - `chunk` — не догрузился код экрана (обычно та же сеть или свежий деплой);
 * - `unknown` — ошибка в самом приложении.
 */
export type AppErrorKind = 'offline' | 'server-unreachable' | 'server' | 'chunk' | 'unknown';

export interface AppError {
  kind: AppErrorKind;
  /** Для поддержки: HTTP-статус, код сетевой ошибки или имя исключения. */
  code: string;
  /** Техническое сообщение — пишется к коду, если есть. */
  detail?: string;
}

export const APP_ERROR_MESSAGES: Record<AppErrorKind, string> = {
  offline: 'Нет подключения к интернету. Проверьте Wi-Fi или мобильную сеть и попробуйте снова.',
  'server-unreachable':
    'Отсутствует соединение с сервером. Проверьте своё подключение и попробуйте снова.',
  server: 'На сервере что-то пошло не так. Попробуйте снова через пару минут.',
  chunk: 'Не удалось загрузить экран. Проверьте подключение и попробуйте снова.',
  unknown:
    'Что-то пошло не так. Попробуйте снова — если ошибка повторится, перезапустите приложение.',
};

/** Прокси отвечает ими, когда до самого API не достучался, — это обрыв связи, а не баг. */
const UNREACHABLE_STATUSES = new Set([502, 503, 504]);

/** Тексты динамического import() в Chrome, Firefox и Safari соответственно. */
const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;

/** Длинный стек или HTML-страница прокси в коде ошибки только мешают. */
const DETAIL_MAX_LENGTH = 120;

const clip = (text: string | undefined): string | undefined => {
  const trimmed = text?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.length > DETAIL_MAX_LENGTH ? `${trimmed.slice(0, DETAIL_MAX_LENGTH)}…` : trimmed;
};

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/** Ответ роутера (`throw new Response(...)`, 404 и т.п.) — без зависимости от react-router. */
const isResponseLike = (error: unknown): error is { status: number; statusText?: string } =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  typeof (error as { status: unknown }).status === 'number';

const fromStatus = (status: number, detail?: string): AppError => {
  if (UNREACHABLE_STATUSES.has(status)) {
    return { kind: 'server-unreachable', code: String(status) };
  }
  return { kind: status >= 500 ? 'server' : 'unknown', code: String(status), detail: clip(detail) };
};

/** Привести что угодно, что бросили, к виду, который можно показать человеку. */
export const toAppError = (error: unknown): AppError => {
  if (isOffline()) {
    return { kind: 'offline', code: 'OFFLINE' };
  }

  if (axios.isAxiosError<{ message?: unknown }>(error)) {
    const status = error.response?.status;
    if (status === undefined) {
      // Ответа нет вовсе: сеть оборвалась, сервер лежит или таймаут.
      return { kind: 'server-unreachable', code: error.code ?? 'ERR_NETWORK' };
    }
    const message = error.response?.data?.message;
    return fromStatus(status, typeof message === 'string' ? message : error.message);
  }

  if (error instanceof Error) {
    if (CHUNK_ERROR.test(error.message)) {
      return { kind: 'chunk', code: 'CHUNK_LOAD' };
    }
    return { kind: 'unknown', code: error.name || 'Error', detail: clip(error.message) };
  }

  if (isResponseLike(error)) {
    return fromStatus(error.status, error.statusText);
  }

  return { kind: 'unknown', code: 'UNKNOWN', detail: clip(String(error)) };
};

/** Связь, а не баг: такие ошибки решает проверка соединения, а не перезагрузка. */
export const isConnectionError = (error: AppError): boolean =>
  error.kind === 'offline' || error.kind === 'server-unreachable';

/** Строка в скобках под текстом экрана: «(Код ошибки: …)». */
export const formatErrorCode = ({ code, detail }: AppError): string =>
  detail ? `${code} — ${detail}` : code;

/**
 * Ошибки, из-за которых экран ошибки показывать нельзя: они штатные или
 * обрабатываются в другом месте.
 *
 * - отменённые запросы и `AbortError` — их отменили намеренно;
 * - `NotAllowedError` — браузер не дал автозапуск звука/видео без жеста;
 * - 401 — сессию обновит или завершит интерсептор axios (редирект на вход);
 * - «ResizeObserver loop» — безвредное предупреждение браузера, не ошибка кода;
 * - «Script error.» — браузер прячет так ошибку чужого скрипта (расширение,
 *   встроенный в WebView код): ни причины, ни способа её исправить у нас нет.
 */
export const isBenignError = (error: unknown): boolean => {
  if (axios.isCancel(error)) {
    return true;
  }
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    return true;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error.name === 'AbortError' || error.name === 'NotAllowedError')
  ) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('ResizeObserver loop') || message === 'Script error.';
};
