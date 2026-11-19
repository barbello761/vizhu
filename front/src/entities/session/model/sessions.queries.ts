import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { sessionsApi, type SessionsResponse } from '../api';

export const sessionKeys = {
  all: ['sessions'] as const,
};

/**
 * Список сеансов. Свежий на каждом заходе (staleTime 0): экран открывают как
 * раз затем, чтобы увидеть, кто сейчас в аккаунте.
 */
export const useSessions = () =>
  useQuery({
    queryKey: sessionKeys.all,
    queryFn: sessionsApi.list,
    staleTime: 0,
  });

export const useRevokeSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sessionsApi.revoke,
    onSuccess: (_, id) => {
      // Убираем строку сразу — экран, на который вернёмся, не моргнёт
      // завершённым сеансом, пока идёт перезапрос.
      queryClient.setQueryData<SessionsResponse>(sessionKeys.all, (data) =>
        data ? { ...data, others: data.others.filter((s) => s.id !== id) } : data,
      );
      return queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
};

export const useRevokeOtherSessions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sessionsApi.revokeOthers,
    onSuccess: () => {
      queryClient.setQueryData<SessionsResponse>(sessionKeys.all, (data) =>
        data ? { ...data, others: [] } : data,
      );
      return queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
};
