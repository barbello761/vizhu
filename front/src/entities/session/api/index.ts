import axios from 'axios';

import { api } from '@/shared/api';

import type { RevokeOthersResponse, SessionsResponse } from './types';

export type * from './types';

export const sessionsApi = {
  list: () => api.get<SessionsResponse>('/auth/sessions').then((r) => r.data),

  /**
   * Завершить сеанс на другом устройстве. Свой сеанс так не завершают — для
   * него /auth/logout. 404 — сеанс уже завершён (с другого устройства или
   * истёк): это ровно тот результат, которого человек добивается, не ошибка.
   */
  revoke: (id: string) =>
    api.delete<void>(`/auth/sessions/${id}`).then(
      () => undefined,
      (error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return undefined;
        }
        throw error;
      },
    ),

  /** «Выйти со всех устройств»: все сеансы, кроме текущего. */
  revokeOthers: () => api.delete<RevokeOthersResponse>('/auth/sessions/others').then((r) => r.data),
};
