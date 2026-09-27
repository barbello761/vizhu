import z from 'zod';

export interface Report {
  notHelpful: boolean;
  rude: boolean;
  privacyIntruder: boolean;
  other?: string;
}
export const ReportSchema = z
  .object({
    notHelpful: z.boolean(),
    rude: z.boolean(),
    privacyIntruder: z.boolean(),
    other: z.string().max(200, 'Описываемая Вами причина слишком длинная!').optional(),
  })
  .refine((data) => data.notHelpful || data.rude || data.privacyIntruder || data.other?.trim(), {
    message: 'Выберите хотя бы одну причину!',
    path: ['notHelpful'],
  });
