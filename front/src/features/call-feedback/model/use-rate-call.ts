import { useMutation } from '@tanstack/react-query';

import { feedbackApi } from '../api';
import type { RatingRequest } from '../api/types';

export const useRateCall = (callId: string) =>
  useMutation({
    mutationFn: (body: RatingRequest) => feedbackApi.rate(body, callId),
  });
