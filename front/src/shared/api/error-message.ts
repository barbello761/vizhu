import axios from 'axios';

/** Тело ошибки Nest: message — строка либо список причин валидации. */
type ApiErrorBody = { message?: string | string[] };

export const apiErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return fallback;
  }
  const message = error.response?.data?.message;
  if (typeof message === 'string' && message.trim() !== '') {
    return message;
  }
  if (Array.isArray(message) && typeof message[0] === 'string') {
    return message[0];
  }
  return fallback;
};
