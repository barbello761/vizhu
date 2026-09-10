import { normalizePhone } from '@/features/auth';
import { emailSchema, nameSchema } from '@/features/registration';

/**
 * Проверки полей профиля для инлайн-правки на экране настроек.
 * Схемы имени и почты переиспользуются из регистрации — правила должны совпадать.
 * Каждая функция возвращает текст ошибки или `null`, если значение годится.
 */
const firstIssue = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? null : (result.error?.issues[0]?.message ?? 'Проверьте значение');

export const validateName = (value: string): string | null =>
  firstIssue(nameSchema.safeParse(value));

export const validateEmail = (value: string): string | null =>
  firstIssue(emailSchema.safeParse(value));

export const validatePhone = (value: string): string | null =>
  normalizePhone(value) ? null : 'Проверьте номер телефона';

/** Приводит ввод к формату API (11 цифр с 7). Вызывать только после `validatePhone`. */
export const toApiPhone = (value: string): string => normalizePhone(value) ?? value.trim();
