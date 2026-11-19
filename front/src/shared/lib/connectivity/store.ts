import { createStore } from '@/shared/lib/zustand';

/**
 * - `online` — сервер отвечает;
 * - `offline` — у устройства нет сети;
 * - `server-down` — сеть есть, а сервер не отвечает (или нет интернета за
 *   Wi-Fi — `navigator.onLine` этого не видит, пинг видит).
 */
export type ConnectionStatus = 'online' | 'offline' | 'server-down';

interface ConnectivityState {
  status: ConnectionStatus;
  /** Код последнего неудачного пинга — его показывает экран ошибки. */
  code: string | null;
  /** Проверка в процессе — кнопка «Попробовать снова» крутит спиннер. */
  checking: boolean;
}

/** Пишет сюда только monitor.ts; снаружи стор только читают. */
export const useConnectivityStore = createStore<ConnectivityState>('Connectivity', () => ({
  status: 'online',
  code: null,
  checking: false,
}));
