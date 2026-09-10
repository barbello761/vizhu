import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { historyApi } from './history.api';

export const historyKeys = {
  all: ['history'] as const,
  list: () => [...historyKeys.all, 'list'] as const,
  detail: (id: string) => [...historyKeys.all, 'detail', id] as const,
};

export const useHistory = () =>
  useQuery({
    queryKey: historyKeys.list(),
    queryFn: historyApi.getAll,
    staleTime: 0,
  });

export const useHistoryEntry = (id: string | undefined) =>
  useQuery({
    queryKey: historyKeys.detail(id!),
    queryFn: () => historyApi.getById(id!),
    enabled: Boolean(id),
  });

export const useRenameHistoryEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => historyApi.rename(id, title),
    onSuccess: (entry) => {
      queryClient.setQueryData(historyKeys.detail(entry.id), entry);
      return queryClient.invalidateQueries({ queryKey: historyKeys.list() });
    },
  });
};

export const useDeleteHistoryEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: historyApi.deleteById,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: historyKeys.list() }),
  });
};
