import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from '@/features/auth';
import { server } from '@/shared/api/mocks/server';
import { setAccessToken } from '@/shared/api/token-store';

import { useProfile } from '../use-profile';

const Screen = () => {
  const { data } = useProfile();
  return <p>{data ? `профиль: ${data.name}` : 'профиля нет'}</p>;
};

const Here = () => <p>{`путь: ${useLocation().pathname}`}</p>;

const renderApp = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/profile/settings']}>
        <Routes>
          <Route
            path="/profile/settings"
            element={
              <>
                <Here />
                <Screen />
              </>
            }
          />
          <Route path="/auth" element={<Here />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

/** Профиля нет — ровно то, что отдаёт бэкенд удалённому аккаунту. */
const respondNotFound = () =>
  server.use(
    http.get('*/profile', () =>
      HttpResponse.json({ message: 'Профиль не найден' }, { status: 404 }),
    ),
  );

describe('useProfile: аккаунт удалён с другого устройства', () => {
  beforeEach(() => {
    setAccessToken('token');
    useAuthStore.setState({
      isAuthed: true,
      isRegistered: true,
      phone: null,
      userName: null,
      role: null,
    });
  });

  it('гасит сессию и уводит на вход, когда бэк отвечает 404 на свой же профиль', async () => {
    respondNotFound();
    renderApp();

    await waitFor(() => expect(screen.getByText('путь: /auth')).toBeInTheDocument());
    expect(useAuthStore.getState().isAuthed).toBe(false);
  });

  it('не трогает сессию при незавершённой регистрации: там 404 такой же, но аккаунт жив', async () => {
    useAuthStore.setState({ isRegistered: false });
    respondNotFound();
    renderApp();

    await waitFor(() => expect(screen.getByText('профиля нет')).toBeInTheDocument());
    expect(screen.getByText('путь: /profile/settings')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthed).toBe(true);
  });

  it('обычный профиль не приводит к разлогину', async () => {
    renderApp();

    await waitFor(() => expect(screen.getByText(/^профиль: /)).toBeInTheDocument());
    expect(useAuthStore.getState().isAuthed).toBe(true);
  });
});
