import { beforeEach, describe, expect, it } from 'vitest';

import { getAccessToken } from '@/shared/api/token-store';

import { useAuthStore } from '../auth.store';

const reset = () =>
  useAuthStore.setState({
    isAuthed: false,
    isRegistered: false,
    phone: null,
    userName: null,
    role: null,
  });

describe('useAuthStore', () => {
  beforeEach(reset);

  it('первый вход: сессия есть, регистрация ещё не пройдена', () => {
    useAuthStore.getState().login('token', false);

    const { isAuthed, isRegistered } = useAuthStore.getState();
    expect(isAuthed).toBe(true);
    expect(isRegistered).toBe(false);
    expect(getAccessToken()).toBe('token');
  });

  it('повторный вход: профиль уже есть — регистрацию проходить не нужно', () => {
    useAuthStore.getState().login('token', true);

    expect(useAuthStore.getState().isRegistered).toBe(true);
  });

  it('setRegistered поднимает флаг после создания профиля', () => {
    useAuthStore.getState().login('token', false);
    useAuthStore.getState().setRegistered(true);

    expect(useAuthStore.getState().isRegistered).toBe(true);
  });

  it('миграция персиста v0 → v1 не выкидывает действующих пользователей на регистрацию', () => {
    const { migrate } = useAuthStore.persist.getOptions();
    // Состояние из версии без флага: человек давно вошёл и пользуется приложением.
    const legacy = { isAuthed: true, phone: '79001234567', userName: 'Ваня', role: null };

    const migrated = migrate?.(legacy, 0) as { isRegistered?: boolean };

    expect(migrated.isRegistered).toBe(true);
  });

  it('миграция не трогает неавторизованное состояние', () => {
    const { migrate } = useAuthStore.persist.getOptions();

    const migrated = migrate?.({ isAuthed: false }, 0) as { isRegistered?: boolean };

    expect(migrated.isRegistered).toBeUndefined();
  });

  it('logout сбрасывает и сессию, и статус регистрации', () => {
    useAuthStore.getState().login('token', true);
    useAuthStore.getState().setRole('volunteer');
    useAuthStore.getState().logout();

    const { isAuthed, isRegistered, role } = useAuthStore.getState();
    expect(isAuthed).toBe(false);
    // Иначе следующий пользователь на этом устройстве проскочил бы регистрацию.
    expect(isRegistered).toBe(false);
    expect(role).toBeNull();
    expect(getAccessToken()).toBeNull();
  });
});
