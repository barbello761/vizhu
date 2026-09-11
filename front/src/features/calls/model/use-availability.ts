import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth';

import { callsApi } from '../api';

export const availabilityQueryKey = ['calls', 'availability'] as const;

/**
 * Сколько волонтёров сейчас на линии.
 *
 * Число живое: волонтёры встают и уходят с линии постоянно, поэтому
 * перезапрашиваем на фокусе и раз в 15 секунд, пока экран открыт.
 * Кэш не держим (`staleTime: 0`) — устаревшее число тут хуже, чем его отсутствие.
 */
export const useVolunteerAvailability = () => {
  const isAuthed = useAuthStore((s) => s.isAuthed);

  return useQuery({
    queryKey: availabilityQueryKey,
    queryFn: async () => (await callsApi.getAvailability()).data,
    enabled: isAuthed,
    staleTime: 0,
    refetchInterval: 15_000,
  });
};
