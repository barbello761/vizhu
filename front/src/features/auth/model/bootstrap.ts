import axios from 'axios';

// Намеренно из `@/features/profile/api`, а не из бареля фичи: барель тянет
// `use-profile`, который импортирует `@/features/auth` — вышел бы цикл модулей.
// Сам `api`-модуль профиля ни от чего, кроме `shared`, не зависит.
import { profileApi } from '@/features/profile/api';
import { refreshSession } from '@/shared/api';
import { getAccessToken } from '@/shared/api/token-store';

import { useAuthStore } from './auth.store';

const statusOf = (error: unknown): number | undefined =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

/**
 * Сверить статус регистрации с бэком. Источник правды — наличие профиля,
 * а не локальный флаг: он мог устареть (обновление приложения, переустановка,
 * прерванная регистрация).
 *
 * - 200 — профиль есть, регистрация пройдена;
 * - 404 — токен есть, профиля нет: регистрацию прервали, гард отправит
 *   дозаполнять;
 * - что угодно ещё (офлайн, 5xx) — флаг не трогаем. Холодный старт без сети
 *   не повод выкидывать человека на повторную регистрацию.
 */
const syncRegistrationState = async (): Promise<void> => {
  try {
    await profileApi.getProfile();
    useAuthStore.getState().setRegistered(true);
  } catch (error) {
    if (statusOf(error) === 404) {
      useAuthStore.getState().setRegistered(false);
    }
  }
};

/**
 * Восстановление сессии при старте приложения.
 *
 * Access-токен живёт только в памяти и после перезагрузки страницы теряется.
 * Если персист говорит, что пользователь залогинен, — тихо обновляем токен
 * по httpOnly-куке (POST /auth/refresh) ДО первого рендера, чтобы гарды
 * роутера и первые запросы работали с валидным токеном.
 *
 * Разлогиниваем только при явном отказе сервера (401/403). Сетевая ошибка
 * (офлайн-PWA) сессию не рушит: axios-интерсептор повторит refresh при
 * первом же запросе.
 */
export const bootstrapAuth = async (): Promise<void> => {
  const { isAuthed, isRegistered, login, logout } = useAuthStore.getState();
  if (!isAuthed) {
    return;
  }

  if (!getAccessToken()) {
    try {
      const accessToken = await refreshSession();
      // Восстановление сессии, а не новый вход: статус регистрации берём из
      // персиста как есть, ниже его уточнит запрос профиля.
      login(accessToken, isRegistered);
    } catch (error) {
      const status = statusOf(error);
      if (status === 401 || status === 403) {
        logout();
      }
      return;
    }
  }

  await syncRegistrationState();
};
