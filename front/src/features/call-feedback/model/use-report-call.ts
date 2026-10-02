import { useMutation } from '@tanstack/react-query';

import { feedbackApi } from '../api';
import type { ReportRequest } from '../api/types';

export const useReportCall = (callId: string) =>
  useMutation({
    mutationFn: (body: ReportRequest) => feedbackApi.report(body, callId),
  });
