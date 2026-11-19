import { api } from '@/shared/api';

import type {
  ActiveVerificationResponse,
  EmailPurpose,
  EmailVerification,
  EmailVerificationState,
} from './types';

export type * from './types';

export const emailVerificationApi = {
  /** Отправить письмо со ссылкой. `email` учитывается только для change_email. */
  request: (purpose: EmailPurpose, email?: string) =>
    api.post<EmailVerification>('/email/verifications', { purpose, email }),

  confirm: (token: string) =>
    api.post<{ purpose: EmailPurpose }>('/email/verifications/confirm', { token }),

  /** За этим ходит кнопка «Я перешёл по ссылке». */
  status: (id: string) => api.get<EmailVerificationState>(`/email/verifications/${id}`),

  /**
   * Начатое и ещё живое подтверждение действия. Экран «Проверьте почту»
   * продолжает его, а не шлёт новое письмо: новое погасило бы ссылку, по
   * которой человек, возможно, уже перешёл.
   */
  active: (purpose: EmailPurpose) =>
    api.get<ActiveVerificationResponse>('/email/verifications/active', { params: { purpose } }),
};
