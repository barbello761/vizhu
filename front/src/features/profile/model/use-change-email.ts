import { useMutation, useQueryClient } from '@tanstack/react-query';

import { profileApi, type Profile } from '../api';
import { profileQueryKey } from './use-profile';

export const useChangeEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (verificationId: string) =>
      profileApi.changeEmail(verificationId).then((r) => r.data),
    onSuccess: (profile) => {
      queryClient.setQueryData<Profile>(profileQueryKey, profile);
    },
  });
};
