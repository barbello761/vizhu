import { api } from '@/shared/api';

export type EmailPurpose = 'verify_email' | 'change_email' | 'change_phone' | 'delete_account';

export type VerificationStatus = 'pending' | 'confirmed' | 'consumed' | 'expired';

/** Ответ на запрос письма. `id` нужен всем последующим шагам флоу. */
export type EmailVerification = {
  id: string;
  email: string;
  expiresAt: string;
};

export type EmailVerificationState = EmailVerification & {
  purpose: EmailPurpose;
  status: VerificationStatus;
};

export const emailVerificationApi = {
  /** Отправить письмо со ссылкой. `email` учитывается только для change_email. */
  request: (purpose: EmailPurpose, email?: string) =>
    api.post<EmailVerification>('/email/verifications', { purpose, email }),

  confirm: (token: string) =>
    api.post<{ purpose: EmailPurpose }>('/email/verifications/confirm', { token }),

  /** За этим ходит кнопка «Я перешёл по ссылке». */
  status: (id: string) => api.get<EmailVerificationState>(`/email/verifications/${id}`),
};
