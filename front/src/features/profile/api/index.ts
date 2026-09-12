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

/**
 * Поля, которые бэкенд разрешает менять через PATCH /profile.
 *
 * Только имя: телефон — идентификатор входа (меняется отдельным флоу с
 * подтверждением), почта в БД пока не хранится вовсе. Оба поля появятся здесь
 * вместе со своими ручками.
 */
export type ProfileUpdate = Pick<Profile, 'name'>;

export const profileApi = {
  getProfile: () => api.get<Profile>('/profile'),

  // PATCH /profile — точечное обновление своих данных, отдаёт свежий профиль целиком.
  updateProfile: (patch: ProfileUpdate) => api.patch<Profile>('/profile', patch),

  // DELETE /profile — безвозвратно удаляет аккаунт вместе с историей и сессиями.
  deleteProfile: () => api.delete<void>('/profile'),
};
