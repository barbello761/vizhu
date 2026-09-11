/**
 * Приводит введённый номер к формату API — 11 цифр, начинающихся с 7.
 *
 * Поле намеренно лояльно к вводу: принимаются `8…`, `+7…`, номер без кода
 * страны, со скобками, пробелами и тире. Возвращает `null`, если из строки
 * не получается российский номер.
 */
export const normalizePhone = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 10) {
    return `7${digits}`;
  }
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `7${digits.slice(1)}`;
  }
  return null;
};

/** Обратное преобразование для показа: `79991234567` → `+7 999 123 45 67`. */
export const formatPhone = (normalized: string): string => {
  const match = /^7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(normalized);
  return match ? `+7 ${match[1]} ${match[2]} ${match[3]} ${match[4]}` : normalized;
};
