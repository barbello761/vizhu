import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth';

import { profileApi } from '../api';

export const useDeleteProfile = () => {
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: () => profileApi.deleteProfile().then(() => undefined),
    onSuccess: () => logout(),
  });
};
