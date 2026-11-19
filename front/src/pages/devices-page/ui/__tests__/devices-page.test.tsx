import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Session, SessionsResponse } from '@/entities/session';
import { server } from '@/shared/api/mocks/server';
import { setAccessToken } from '@/shared/api/token-store';
import * as a11y from '@/shared/lib/a11y';

import { DevicesPage } from '..';

const session = (id: string, deviceName: string, platform: Session['platform']): Session => ({
  id,
  deviceName,
  client: 'native',
  platform,
  createdAt: '2026-11-01T10:00:00.000Z',
  lastActiveAt: new Date().toISOString(),
});

const CURRENT = session('current', 'Pixel 7', 'android');
const IPHONE = session('iphone', 'iPhone', 'ios');
const WINDOWS = { ...session('windows', 'Chrome, Windows', 'windows'), client: 'web' as const };

const serveSessions = (initial: SessionsResponse) => {
  let state = initial;
  const revoked: string[] = [];
  server.use(
    http.get('*/auth/sessions', () => HttpResponse.json(state)),
    http.delete('*/auth/sessions/:id', ({ params }) => {
      revoked.push(params.id as string);
      state = { ...state, others: state.others.filter((s) => s.id !== params.id) };
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return revoked;
};

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/profile', '/profile/devices']} initialIndex={1}>
        <Routes>
          <Route path="/profile/devices" element={<DevicesPage />} />
          <Route path="/logout-all" element={<p>Экран выхода со всех</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('DevicesPage', () => {
  beforeEach(() => {
    setAccessToken('token');
    vi.restoreAllMocks();
  });

  it('это устройство и остальные сеансы — разными разделами с заголовками', async () => {
    serveSessions({ current: CURRENT, others: [IPHONE, WINDOWS] });
    renderPage();

    const current = await screen.findByRole('region', { name: 'Это устройство' });
    expect(within(current).getByRole('heading', { name: 'Pixel 7' })).toBeInTheDocument();
    // У своего сеанса кнопки завершения нет: его закрывает «Выйти из аккаунта».
    expect(within(current).queryByRole('button')).not.toBeInTheDocument();

    const others = screen.getByRole('region', { name: 'Активные сеансы' });
    expect(within(others).getAllByRole('listitem')).toHaveLength(2);
  });

  it('у каждой кнопки «Завершить сеанс» в имени — какое устройство', async () => {
    serveSessions({ current: CURRENT, others: [IPHONE, WINDOWS] });
    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Завершить сеанс на устройстве iPhone' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Завершить сеанс на устройстве Chrome, Windows' }),
    ).toBeInTheDocument();
  });

  it('объявляет экран со сводкой, когда список загрузился', async () => {
    const announce = vi.spyOn(a11y, 'announceRouteChange');
    serveSessions({ current: CURRENT, others: [IPHONE, WINDOWS] });
    renderPage();

    await waitFor(() =>
      expect(announce).toHaveBeenCalledWith('Устройства. Кроме этого, активно ещё 2 сеанса.'),
    );
  });

  it('завершение сеанса: окно с вопросом → запрос → строка пропала, фокус на разделе', async () => {
    const user = userEvent.setup();
    const announce = vi.spyOn(a11y, 'announceRouteChange');
    const revoked = serveSessions({ current: CURRENT, others: [IPHONE, WINDOWS] });
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Завершить сеанс на устройстве iPhone' }),
    );
    const dialog = screen.getByRole('dialog', { name: /Завершить\s+сеанс\?/ });
    expect(dialog).toHaveAccessibleDescription(/На устройстве «iPhone» нужно будет снова войти/);

    await user.click(within(dialog).getByRole('button', { name: 'Завершить сеанс' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(revoked).toEqual(['iphone']);
    expect(screen.queryByRole('heading', { name: 'iPhone' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Активные сеансы' })).toHaveFocus();
    expect(announce).toHaveBeenCalledWith(
      'Сеанс на устройстве iPhone завершён. Кроме этого, активно ещё 1 сеанс.',
    );
  });

  it('«Отмена» закрывает окно без запроса', async () => {
    const user = userEvent.setup();
    const revoked = serveSessions({ current: CURRENT, others: [IPHONE] });
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Завершить сеанс на устройстве iPhone' }),
    );
    await user.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(revoked).toEqual([]);
    expect(screen.getByRole('heading', { name: 'iPhone' })).toBeInTheDocument();
  });

  it('ошибка завершения остаётся в окне и озвучивается', async () => {
    const user = userEvent.setup();
    const announce = vi.spyOn(a11y, 'announceRouteChange');
    serveSessions({ current: CURRENT, others: [IPHONE] });
    server.use(
      http.delete('*/auth/sessions/:id', () =>
        HttpResponse.json({ message: 'Сервер недоступен' }, { status: 503 }),
      ),
    );
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Завершить сеанс на устройстве iPhone' }),
    );
    await user.click(screen.getByRole('button', { name: 'Завершить сеанс' }));

    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(announce).toHaveBeenCalledWith(expect.stringMatching(/./)));
    expect(
      within(dialog).getAllByText(/Сервер недоступен|Не удалось завершить сеанс/),
    ).not.toHaveLength(0);
  });

  it('«Выйти со всех устройств» ведёт на подтверждение', async () => {
    const user = userEvent.setup();
    serveSessions({ current: CURRENT, others: [IPHONE] });
    renderPage();

    const logoutAll = await screen.findByRole('button', { name: 'Выйти со всех устройств' });
    // Главное действие экрана — акцентная кнопка.
    expect(logoutAll).toHaveClass('btn-v2--primary');
    await user.click(logoutAll);
    expect(screen.getByText('Экран выхода со всех')).toBeInTheDocument();
  });

  it('других сеансов нет: пояснение, а «Выйти со всех» в фокусе, но объясняет, почему не работает', async () => {
    const user = userEvent.setup();
    const announce = vi.spyOn(a11y, 'announceRouteChange');
    serveSessions({ current: CURRENT, others: [] });
    renderPage();

    expect(await screen.findByText(/Если войти в аккаунт на другом телефоне/)).toBeInTheDocument();
    const logoutAll = screen.getByRole('button', { name: /^Выйти со всех устройств/ });
    expect(logoutAll).toHaveAttribute('aria-disabled', 'true');
    expect(logoutAll).toHaveAccessibleName(
      'Выйти со всех устройств. Других активных сеансов нет — выходить не из чего',
    );

    await user.click(logoutAll);
    expect(screen.queryByText('Экран выхода со всех')).not.toBeInTheDocument();
    expect(announce).toHaveBeenCalledWith('Других активных сеансов нет — выходить не из чего');
  });

  it('пока список грузится, «Выйти со всех» не врёт, что других сеансов нет', async () => {
    const user = userEvent.setup();
    const announce = vi.spyOn(a11y, 'announceRouteChange');
    server.use(http.get('*/auth/sessions', () => new Promise(() => undefined)));
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Загружаем список устройств');
    const logoutAll = screen.getByRole('button', { name: /^Выйти со всех устройств/ });
    expect(logoutAll).toHaveAccessibleName(
      'Выйти со всех устройств. Список устройств ещё загружается',
    );

    await user.click(logoutAll);
    expect(announce).toHaveBeenCalledWith('Список устройств ещё загружается');
    expect(screen.queryByText('Экран выхода со всех')).not.toBeInTheDocument();
  });
});
