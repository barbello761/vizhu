import { z } from 'zod';

export const NAME_MIN_LENGTH = 2;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const nameSchema = z
  .string()
  .trim()
  .min(NAME_MIN_LENGTH, `В имени должно быть минимум ${NAME_MIN_LENGTH} символа`);

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Введите электронную почту')
  .refine((value) => value.includes('@'), 'В адресе не хватает знака «@»')
  .refine((value) => EMAIL_PATTERN.test(value), 'Проверьте адрес электронной почты');
