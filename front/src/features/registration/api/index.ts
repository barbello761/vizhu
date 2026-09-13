import type { UserRole } from '@/entities/user';
import { api } from '@/shared/api';

export type ProfilePayload = {
  name: string;
  role: UserRole;
  email?: string;
};

export const registrationApi = {
  createProfile: (payload: ProfilePayload) => api.post<void>('/profile', payload),
};
