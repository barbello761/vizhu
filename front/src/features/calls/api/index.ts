import { api } from '@/shared/api';

export type CallAvailability = {
  /** Сколько волонтёров сейчас свободны и готовы принять звонок. */
  available: number;
};

export const callsApi = {
  // GET /calls/availability — снимок пула свободных волонтёров на бэке.
  getAvailability: () => api.get<CallAvailability>('/calls/availability'),
};
