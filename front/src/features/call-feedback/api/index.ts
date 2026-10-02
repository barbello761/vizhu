import { api } from '@/shared/api';

import type { RatingRequest, ReportRequest } from './types';

export const feedbackApi = {
  rate: (body: RatingRequest, id: string) => api.post<void>(`/calls/${id}/rating`, body),
  report: (body: ReportRequest, id: string) => api.post<void>(`/calls/${id}/report`, body),
};
