import { useQuery } from '@tanstack/react-query';

import { emailVerificationApi } from '../api';

/** Как часто спрашивать, перешли ли по ссылке, пока экран на виду. */
const POLL_INTERVAL_MS = 4000;

export const verificationStatusKey = (id: string) => ['email-verification', id] as const;

/**
 * Состояние тикета в реальном времени: пока по ссылке не перешли, спрашиваем
 * бэкенд раз в несколько секунд. Опрос идёт только при видимой вкладке
 * (refetchIntervalInBackground выключен по умолчанию) и при возврате в
 * приложение из почты — то есть ровно тогда, когда ответ кому-то нужен.
 *
 * Опрос, а не SSE/сокет: событие единичное, ждать его минуту-другую, а
 * авторизация у нас Bearer-токеном, который EventSource передать не умеет.
 */
export const useVerificationStatus = (id: string | null) =>
  useQuery({
    queryKey: verificationStatusKey(id ?? ''),
    queryFn: async () => (await emailVerificationApi.status(id ?? '')).data,
    enabled: id !== null,
    staleTime: 0,
    refetchOnWindowFocus: 'always',
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? POLL_INTERVAL_MS : false),
    // Ошибка опроса не повод показывать её человеку: кнопка «Я перешёл по
    // ссылке» перепроверит всё сама и объяснит, если что-то не так.
    retry: false,
  });
