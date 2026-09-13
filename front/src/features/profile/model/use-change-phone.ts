import { useMutation, useQueryClient } from '@tanstack/react-query';

import { profileApi, type ChangePhonePayload, type Profile } from '../api';
import { profileQueryKey } from './use-profile';

export const useChangePhone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ChangePhonePayload) =>
      profileApi.changePhone(payload).then((r) => r.data),
    onSuccess: (profile) => {
      queryClient.setQueryData<Profile>(profileQueryKey, profile);
    },
  });
};
