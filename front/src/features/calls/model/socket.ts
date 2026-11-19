import type { Socket } from 'socket.io-client';

import { getAccessToken } from '@/shared/api/token-store';
import { env } from '@/shared/config';

/**
 * Singleton Socket.IO-клиента матчинга.
 *
 * - Клиент (~30 КБ gzip вместе с engine.io) подгружается отдельным чанком при
 *   первом обращении: сокет нужен только тем, кто встаёт на линию или зовёт
 *   помощь, а не на старте приложения.
 * - `autoConnect: false` — подключаемся вручную, когда появляется намерение
 *   (встать на линию / позвать помощь).
 * - `auth` как функция — socket.io дёргает её на каждый (пере)коннект, поэтому
 *   всегда уходит свежий auth-JWT (важно после refresh токена).
 * - reconnection включён по умолчанию — восстановление статуса делаем сами
 *   на событии `connect` (см. call.store).
 */
let socketPromise: Promise<Socket> | null = null;

export const loadSocket = (): Promise<Socket> => {
  if (!socketPromise) {
    socketPromise = import('socket.io-client').then(({ io }) =>
      io(env.socketUrl, {
        autoConnect: false,
        transports: ['websocket'],
        auth: (cb) => cb({ token: getAccessToken() ?? '' }),
      }),
    );
    // Чанк не загрузился (web без сети) — даём следующему действию попробовать снова.
    socketPromise.catch(() => {
      socketPromise = null;
    });
  }
  return socketPromise;
};
