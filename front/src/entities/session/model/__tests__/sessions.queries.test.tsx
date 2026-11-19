import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '@/shared/api/mocks/server';
import { setAccessToken } from '@/shared/api/token-store';

import type { Session, SessionsResponse } from '../../api';
import {
  sessionKeys,
  useRevokeOtherSessions,
  useRevokeSession,
  useSessions,
} from '../sessions.queries';

const session = (id: string): Session => ({
  id,
  deviceName: id,
  client: 'native',
  platform: 'android',
  createdAt: '2026-11-01T10:00:00.000Z',
  lastActiveAt: '2026-11-19T10:00:00.000Z',
});

const LIST: SessionsResponse = {
  current: session('current'),
  others: [session('pixel'), session('iphone')],
};

const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
};

describe('sessions queries', () => {
  beforeEach(() => {
    setAccessToken('token');
  });

  it('useSessions отдаёт текущий сеанс и остальные', async () => {
    server.use(http.get('*/auth/sessions', () => HttpResponse.json(LIST)));
    const { wrapper } = setup();

    const { result } = renderHook(() => useSessions(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(LIST));
  });

  it('useRevokeSession убирает строку из кэша сразу', async () => {
    let deleted: string | undefined;
    server.use(
      http.delete('*/auth/sessions/:id', ({ params }) => {
        deleted = params.id as string;
        return new HttpResponse(null, { status: 204 });
      }),
      // Перезапрос после инвалидации долго идёт — проверяем именно кэш до него.
      http.get('*/auth/sessions', () => new Promise(() => undefined)),
    );
    const { client, wrapper } = setup();
    client.setQueryData(sessionKeys.all, LIST);

    const { result } = renderHook(() => useRevokeSession(), { wrapper });
    act(() => result.current.mutate('pixel'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(deleted).toBe('pixel');
    expect(client.getQueryData<SessionsResponse>(sessionKeys.all)?.others).toEqual([
      session('iphone'),
    ]);
  });

  it('сеанс уже завершён (404) — это успех, а не ошибка', async () => {
    server.use(
      http.delete('*/auth/sessions/:id', () =>
        HttpResponse.json({ message: 'Сеанс не найден' }, { status: 404 }),
      ),
      http.get('*/auth/sessions', () => new Promise(() => undefined)),
    );
    const { wrapper } = setup();

    const { result } = renderHook(() => useRevokeSession(), { wrapper });
    act(() => result.current.mutate('gone'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useRevokeOtherSessions оставляет только текущий сеанс', async () => {
    server.use(
      http.delete('*/auth/sessions/others', () => HttpResponse.json({ revoked: 2 })),
      http.get('*/auth/sessions', () => new Promise(() => undefined)),
    );
    const { client, wrapper } = setup();
    client.setQueryData(sessionKeys.all, LIST);

    const { result } = renderHook(() => useRevokeOtherSessions(), { wrapper });
    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.data).toEqual({ revoked: 2 }));
    expect(client.getQueryData<SessionsResponse>(sessionKeys.all)).toEqual({
      current: LIST.current,
      others: [],
    });
  });
});
