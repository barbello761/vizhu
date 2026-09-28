import z from 'zod';

import type { SegmentedControlOption } from '@/shared/ui';

export const RatingChoice = {
  Bad: 'bad',
  Neutral: 'neutral',
  Good: 'good',
} as const;

export type RatingChoice = (typeof RatingChoice)[keyof typeof RatingChoice];

export interface Rating {
  rating: RatingChoice;
}

export const FORM_ID = 'rating_form';

export const CHOICE_OPTIONS: readonly SegmentedControlOption<RatingChoice>[] = [
  { value: 'bad', label: 'Плохо' },
  { value: 'neutral', label: 'Хорошо' },
  { value: 'good', label: 'Отлично' },
];

export const RatingSchema = z
  .object({
    rating: z.enum(RatingChoice),
  })
  .refine((data) => data.rating, {
    message: 'Выберите хотя бы одну оценку!',
    path: ['rating'],
  });
