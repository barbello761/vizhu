import type { UserRole } from '@/entities/user';
import { api } from '@/shared/api';

export type { UserRole };

export type BlindnessTypeRef = {
  id: number;
  name: string;
};

/** Плоский профиль текущего пользователя (см. GET /profile на бэке). */
export type Profile = {
  uuid: string;
  name: string;
  age: number | null;
  role: UserRole;
  phone: string | null;
  email: string | null;
  blindnessType: BlindnessTypeRef | null;
  isVerified: boolean;
  createdAt: string;
};

/** Поля, которые пользователь может поменять на экране «Настройки профиля». */
export type ProfileUpdate = Partial<Pick<Profile, 'name' | 'phone' | 'email'>>;

export const profileApi = {
  getProfile: () => api.get<Profile>('/profile'),

  // PATCH /profile — точечное обновление своих данных, отдаёт свежий профиль целиком.
  updateProfile: (patch: ProfileUpdate) => api.patch<Profile>('/profile', patch),
};
