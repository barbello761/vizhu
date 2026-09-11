import type { UserRole } from '@/entities/user';
import { api } from '@/shared/api';

export type BlindnessType = {
  id: number;
  name: string;
};

/**
 * Тело POST /profile. Бэк принимает ровно два поля (см.
 * `api/src/modules/users/users.controller.ts`): имя и роль — возраст и тип
 * слепоты из контракта убраны.
 */
export type ProfilePayload = {
  name: string;
  role: UserRole;
};

export const registrationApi = {
  getBlindnessTypes: () => api.get<BlindnessType[]>('/blindness-types'),

  createProfile: (payload: ProfilePayload) => api.post<void>('/profile', payload),
};
