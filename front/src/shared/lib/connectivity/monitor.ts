import { pingServer } from '@/shared/api/health';

import { useConnectivityStore } from './store';

/**
 * Паузы между проверками, пока связи нет. Сначала часто — короткий обрыв
 * (лифт, туннель) чинится сам за секунды, и человек не должен ждать. Потом
 * реже — лежащий сервер не надо добивать запросами со всех устройств.
 */
const HEARTBEAT_DELAYS_MS = [3000, 5000, 10_000, 20_000, 30_000];

/**
 * Сколько после удачного пинга верим, что связь есть. Ошибки запросов
 * приходят пачкой (экран шлёт несколько разом) — пинговать на каждую незачем.
 */
const TRUST_SUCCESS_MS = 3000;

let inflight: Promise<boolean> | null = null;
let lastSuccessAt = 0;
let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatAttempt = 0;
const restoreListeners = new Set<() => void>();

const setState = useConnectivityStore.setState;

const stopHeartbeat = () => {
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
  }
  heartbeatAttempt = 0;
};

const scheduleHeartbeat = () => {
  if (heartbeatTimer) {
    return;
  }
  const delay = HEARTBEAT_DELAYS_MS[Math.min(heartbeatAttempt, HEARTBEAT_DELAYS_MS.length - 1)];
  heartbeatAttempt += 1;
  heartbeatTimer = setTimeout(() => {
    heartbeatTimer = null;
    void checkConnection();
  }, delay);
};

const markOnline = () => {
  const wasDown = useConnectivityStore.getState().status !== 'online';
  lastSuccessAt = Date.now();
  stopHeartbeat();
  setState({ status: 'online', code: null, checking: false });
  if (wasDown) {
    restoreListeners.forEach((listener) => listener());
  }
};

const markDown = (status: 'offline' | 'server-down', code: string) => {
  setState({ status, code, checking: false });
  scheduleHeartbeat();
};

const runCheck = async (): Promise<boolean> => {
  setState({ checking: true });
  if (!navigator.onLine) {
    markDown('offline', 'OFFLINE');
    return false;
  }
  const result = await pingServer();
  if (result.ok) {
    markOnline();
    return true;
  }
  markDown('server-down', result.code);
  return false;
};

/**
 * Проверить связь с сервером прямо сейчас. Параллельные вызовы делят один
 * запрос. Пока связи нет, проверка повторяется сама (heartbeat), а при
 * восстановлении срабатывают подписчики `onConnectionRestored`.
 */
export const checkConnection = (): Promise<boolean> => {
  inflight ??= runCheck().finally(() => {
    inflight = null;
  });
  return inflight;
};

/**
 * Запрос упал без ответа сервера — повод проверить связь, но не повод сразу
 * пугать человека: один оборванный запрос ещё не «нет соединения». Экран
 * покажет только неудачный пинг.
 */
export const reportConnectionFailure = (): void => {
  if (Date.now() - lastSuccessAt < TRUST_SUCCESS_MS) {
    return;
  }
  void checkConnection();
};

/** Подписка на «связь вернулась». Возвращает отписку. */
export const onConnectionRestored = (listener: () => void): (() => void) => {
  restoreListeners.add(listener);
  return () => restoreListeners.delete(listener);
};

/**
 * Слушать события сети и возвращение в приложение. Возвращает отписку.
 *
 * `offline` надёжен — показываем экран сразу. `online` лишь значит, что
 * появился интерфейс, а не что сервер доступен, поэтому по нему пингуем.
 * При возврате на вкладку тоже пингуем, если до этого связи не было: таймеры
 * в фоне браузер замораживает, и heartbeat мог не дожить.
 */
export const startConnectivityMonitor = (): (() => void) => {
  const handleOffline = () => markDown('offline', 'OFFLINE');
  const handleOnline = () => void checkConnection();
  const handleVisibility = () => {
    if (
      document.visibilityState === 'visible' &&
      useConnectivityStore.getState().status !== 'online'
    ) {
      void checkConnection();
    }
  };

  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);
  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibility);
    stopHeartbeat();
  };
};
