import { useMutation, useQueryClient } from '@tanstack/react-query';

import { profileApi, type Profile, type ProfileUpdate } from '../api';
import { profileQueryKey } from './use-profile';

/**
 * Точечное обновление профиля (имя / телефон / почта).
 * Ответ сервера — свежий профиль целиком, кладём его прямо в кэш react-query,
 * поэтому экран обновляется без повторного GET.
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: ProfileUpdate) => profileApi.updateProfile(patch).then((r) => r.data),
    onSuccess: (profile) => {
      queryClient.setQueryData<Profile>(profileQueryKey, profile);
    },
  });
};
