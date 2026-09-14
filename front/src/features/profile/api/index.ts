import type { UserRole } from '@/entities/user';
import { api } from '@/shared/api';

export type { UserRole };

/** Плоский профиль текущего пользователя (см. GET /profile на бэке). */
export type Profile = {
  uuid: string;
  name: string;
  role: UserRole;
  phone: string | null;
  email: string | null;
  emailVerified: boolean;
  isVerified: boolean;
  createdAt: string;
};

export type ProfileUpdate = Pick<Profile, 'name'>;

export type ChangePhonePayload = {
  phone: string;
  code: string;
  verificationId: string;
};

export const profileApi = {
  getProfile: () => api.get<Profile>('/profile'),

  // PATCH /profile — точечное обновление своих данных, отдаёт свежий профиль целиком.
  updateProfile: (patch: ProfileUpdate) => api.patch<Profile>('/profile', patch),

  // Адрес не передаётся: бэк берёт его из подтверждённого тикета.
  changeEmail: (verificationId: string) => api.patch<Profile>('/profile/email', { verificationId }),

  // Код звонком на НОВЫЙ номер — владение им проверяется обязательно.
  sendPhoneOtp: (phone: string) => api.post<{ message: string }>('/profile/phone/otp', { phone }),

  changePhone: (payload: ChangePhonePayload) => api.post<Profile>('/profile/phone', payload),

  // DELETE /profile — безвозвратно удаляет аккаунт вместе с историей и сессиями.
  // `verificationId` обязателен, если у аккаунта есть подтверждённая почта.
  deleteProfile: (verificationId?: string) =>
    api.delete<void>('/profile', {
      data: verificationId ? { verificationId } : undefined,
    }),
};
