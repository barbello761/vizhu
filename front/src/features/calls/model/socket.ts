import type { Socket } from 'socket.io-client';

import { getFreshAccessToken } from '@/shared/api';
import { env } from '@/shared/config';

/**
 * Singleton Socket.IO-клиента матчинга.
 *
 * - Клиент (~30 КБ gzip вместе с engine.io) подгружается отдельным чанком при
 *   первом обращении: сокет нужен только тем, кто встаёт на линию или зовёт
 *   помощь, а не на старте приложения.
 * - `autoConnect: false` — подключаемся вручную, когда появляется намерение
 *   (встать на линию / позвать помощь).
 * - `auth` как функция — socket.io дёргает её на каждый (пере)коннект. Access-
 *   токен живёт 15 минут, а приложение часами висит в фоне «на линии»: при
 *   реконнекте с протухшим токеном middleware сервера отвечал Unauthorized,
 *   и socket.io больше не переподключался — волонтёр видел «Вы на линии»,
 *   будучи офлайн. Поэтому перед handshake токен при необходимости обновляем.
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
        auth: (cb) => {
          void getFreshAccessToken().then((token) => cb({ token: token ?? '' }));
        },
      }),
    );
    // Чанк не загрузился (web без сети) — даём следующему действию попробовать снова.
    socketPromise.catch(() => {
      socketPromise = null;
    });
  }
  return socketPromise;
};
