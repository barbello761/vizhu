import { type RatingChoice } from '@/features/call-feedback/';
import type { SegmentedControlOption } from '@/shared/ui';

export const FORM_ID = 'rating_form';

export const CHOICE_OPTIONS: readonly SegmentedControlOption<RatingChoice>[] = [
  { value: 'bad', label: 'Плохо' },
  { value: 'neutral', label: 'Хорошо' },
  { value: 'good', label: 'Отлично' },
];
