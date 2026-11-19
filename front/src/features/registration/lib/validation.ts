import { z } from 'zod';

export const NAME_MIN_LENGTH = 2;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Схемы строятся на импорте, а баррель фичи грузится на старте ради
// useRegistrationStore. Без @__PURE__ Rollup не знает, что цепочки z.*() без
// побочных эффектов, и тащит весь zod (~28 КБ gzip) в стартовый чанк, хотя
// схемы нужны только экранам с формами — в их чанки zod и уходит.
export const nameSchema = /* @__PURE__ */ z
  .string()
  .trim()
  .min(NAME_MIN_LENGTH, `В имени должно быть минимум ${NAME_MIN_LENGTH} символа`);

export const emailSchema = /* @__PURE__ */ z
  .string()
  .trim()
  .min(1, 'Введите электронную почту')
  .refine((value) => value.includes('@'), 'В адресе не хватает знака «@»')
  .refine((value) => EMAIL_PATTERN.test(value), 'Проверьте адрес электронной почты');
