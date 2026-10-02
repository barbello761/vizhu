import z from 'zod';

import { RatingChoice } from '../api/types';

export const RatingSchema = z.object({
  rating: z.enum(RatingChoice).optional(),
});

export const ReportSchema = z
  .object({
    notHelpful: z.boolean(),
    rude: z.boolean(),
    privacyIntruder: z.boolean(),
    other: z.string().max(200, 'Описываемая Вами причина слишком длинная!').optional(),
  })
  .refine((data) => data.notHelpful || data.rude || data.privacyIntruder || data.other?.trim(), {
    message: 'Выберите хотя бы одну причину!',
    path: ['rude'],
  });
