import type { UserRole } from '@/entities/user';
import { clearStoredRefreshToken } from '@/shared/api/refresh-token-store';
import { setAccessToken } from '@/shared/api/token-store';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { queryClient } from '@/shared/lib/tanstack-query';
import { createPersistedStore } from '@/shared/lib/zustand';

interface AuthState {
  isAuthed: boolean;
  /**
   * Профиль на бэке уже создан (POST /profile прошёл или вход не первый).
   *
   * Отдельный флаг нужен потому, что `isAuthed` поднимается сразу после
   * проверки кода — ДО того, как пользователь прошёл регистрацию. Без него
   * прерванная регистрация (убили приложение, упал запрос) оставляла токен
   * без профиля, и при следующем запуске гард пускал внутрь приложения мимо
   * всего флоу.
   *
   * Это лишь КЭШ: источник правды — наличие профиля на бэке, его сверяет
   * `bootstrapAuth` (GET /profile) на каждом старте. В `false` флаг ставится
   * только явно — для нового пользователя сразу после кода; «неизвестно»
   * всегда трактуется как `true`, иначе обновление приложения выкинуло бы
   * действующих пользователей на повторную регистрацию.
   */
  isRegistered: boolean;
  phone: string | null;
  userName: string | null;
  role: UserRole | null;
}

interface AuthActions {
  /** Вход выполнен. `registered: false` — новый пользователь, профиля ещё нет. */
  login: (accessToken: string, registered: boolean) => void;
  /** Отметить, есть ли на бэке профиль: после POST /profile и после сверки на старте. */
  setRegistered: (registered: boolean) => void;
  logout: () => void;
  setPhone: (phone: string) => void;
  setUserName: (name: string) => void;
  setRole: (role: UserRole) => void;
}

type AuthStore = AuthState & AuthActions;

/**
 * Сессия пользователя.
 *
 * Access-токен НЕ хранится ни в сторе, ни в localStorage — только в памяти
 * (shared/api/token-store): так он недоступен XSS и не протухает в персисте.
 * После перезагрузки страницы токен восстанавливается тихим /auth/refresh
 * по httpOnly-куке (см. ./bootstrap.ts), персистится лишь флаг isAuthed.
 */
export const useAuthStore = createPersistedStore<AuthStore>(
  'Auth',
  (set) => ({
    isAuthed: false,
    isRegistered: false,
    phone: null,
    userName: null,
    role: null,
    login: (accessToken, registered) =>
      set((draft) => {
        draft.isAuthed = true;
        draft.isRegistered = registered;
        setAccessToken(accessToken);
        // Новый аккаунт — чистим кэш, чтобы не показать данные прошлого юзера.
        queryClient.clear();
      }),
    setRegistered: (registered) =>
      set((draft) => {
        draft.isRegistered = registered;
      }),
    logout: () =>
      set((draft) => {
        draft.isAuthed = false;
        draft.isRegistered = false;
        draft.phone = null;
        draft.userName = null;
        draft.role = null;
        setAccessToken(null);
        // Натив: refresh-токен из защищённого хранилища тоже удаляем.
        void clearStoredRefreshToken();
        // Сбрасываем весь кэш запросов (профиль и пр.) при выходе.
        queryClient.clear();
      }),
    setPhone: (phone) =>
      set((draft) => {
        draft.phone = phone;
      }),
    setUserName: (name) =>
      set((draft) => {
        draft.userName = name;
      }),
    setRole: (role) =>
      set((draft) => {
        draft.role = role;
      }),
  }),
  {
    name: STORAGE_KEYS.AUTH,
    version: 1,
    /**
     * v0 → v1: появился `isRegistered`. У всех, кто на момент обновления уже
     * был залогинен, профиль есть — иначе они не смогли бы пользоваться
     * приложением. Без этой миграции значение по умолчанию (`false`) отправляло
     * действующих пользователей на экран согласий, как на первую регистрацию.
     * Фактический статус всё равно перепроверит `bootstrapAuth` по GET /profile.
     */
    migrate: (persisted, version) => {
      const state = persisted as AuthStore | undefined;
      if (version === 0 && state?.isAuthed) {
        return { ...state, isRegistered: true };
      }
      return state as AuthStore;
    },
  },
);
