import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { useAuthStore } from '@/features/auth';
import { announceRouteChange } from '@/shared/lib/a11y';

import { profileApi, type Profile } from '../api';

export const profileQueryKey = ['profile'] as const;

const ACCOUNT_GONE_MESSAGE = 'Аккаунт удалён. Вы вышли из него на этом устройстве.';

const isNotFound = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 404;

/** Профиль текущего пользователя. Кэшируется react-query — можно дёргать из
 * любого места (навигация, кабинет, звонок) без повторных запросов. */
export const useProfile = () => {
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const isRegistered = useAuthStore((s) => s.isRegistered);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const query = useQuery<Profile>({
    queryKey: profileQueryKey,
    queryFn: async () => (await profileApi.getProfile()).data,
    enabled: isAuthed,
    staleTime: 5 * 60 * 1000,
    // Профиль меняется и снаружи приложения: по ссылке из письма переходят в
    // почтовом клиенте, а подтверждение прилетает на бэкенд, минуя нас. Без
    // этого «почта подтверждена» становилось видно только после перезагрузки —
    // на мобиле это означает убить и открыть приложение заново.
    // `always` игнорирует staleTime: 5 минут свежести тут именно и мешали.
    // Запрос маленький, а фокус возвращается нечасто.
    refetchOnWindowFocus: 'always',
    retry: (failureCount, error) =>
      // 404 повторять нечего — профиля нет, и ответ не изменится. Две лишние
      // попытки только оттянули бы разлогин ниже.
      isNotFound(error) ? false : failureCount < 2,
  });

  // 404 по собственному профилю у зарегистрированного пользователя значит одно:
  // аккаунт удалили с другого устройства. Сам по себе токен погас бы только
  // через 15 минут — JwtAuthGuard проверяет подпись и в базу не ходит, — и всё
  // это время экраны рисовались бы пустыми.
  //
  // У прерванной регистрации 404 такой же, но там isRegistered === false:
  // разлогинивать нельзя, гард отправит дозаполнять профиль.
  const isAccountGone = isAuthed && isRegistered && isNotFound(query.error);

  useEffect(() => {
    if (!isAccountGone) {
      return;
    }
    announceRouteChange(ACCOUNT_GONE_MESSAGE);
    logout();
    void navigate('/auth', { replace: true });
  }, [isAccountGone, logout, navigate]);

  return query;
};

/** Является ли текущий пользователь волонтёром (для гейтинга UI). */
export const useIsVolunteer = (): boolean => {
  const { data } = useProfile();
  return data?.role === 'volunteer';
};
