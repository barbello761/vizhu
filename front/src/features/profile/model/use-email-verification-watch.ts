import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useAuthStore } from '@/features/auth';
import { announceRouteChange } from '@/shared/lib/a11y';

import { profileQueryOptions } from './use-profile';

/** Пока почта не подтверждена и экран открыт — спрашиваем раз в столько. */
const POLL_INTERVAL_MS = 5000;

const VERIFIED_MESSAGE = 'Электронная почта подтверждена.';

/**
 * Следит, когда пользователь перейдёт по ссылке из письма, и обновляет
 * профиль без перезагрузки.
 *
 * Подтверждение приходит на бэкенд из почтового клиента, мимо приложения,
 * поэтому узнать о нём можно только спросив. Опрашиваем GET /profile, но
 * узко: только пока почта указана и не подтверждена, только пока экран с её
 * статусом смонтирован, и только при видимой вкладке — refetchIntervalInBackground
 * выключен, а при возврате из почты сработает refetchOnWindowFocus. Как только
 * почта подтверждена, интервал выключается сам.
 *
 * Почему опрос, а не SSE или сокет: событие одно на всю жизнь аккаунта, а
 * держать ради него постоянное соединение (ещё и с Bearer-токеном, которого
 * EventSource не умеет) — дороже, чем пара маленьких запросов, пока экран на
 * виду.
 */
export const useEmailVerificationWatch = () => {
  const isAuthed = useAuthStore((s) => s.isAuthed);

  const query = useQuery({
    ...profileQueryOptions,
    enabled: isAuthed,
    refetchInterval: (q) =>
      q.state.data?.email && !q.state.data.emailVerified ? POLL_INTERVAL_MS : false,
  });

  // Озвучиваем именно переход «не подтверждена → подтверждена», а не любой
  // рендер с подтверждённой почтой: иначе фраза звучала бы при каждом входе.
  const wasUnverified = useRef(false);
  const { data } = query;
  useEffect(() => {
    if (!data?.email) {
      return;
    }
    if (!data.emailVerified) {
      wasUnverified.current = true;
      return;
    }
    if (wasUnverified.current) {
      wasUnverified.current = false;
      announceRouteChange(VERIFIED_MESSAGE);
    }
  }, [data?.email, data?.emailVerified]);

  return query;
};
