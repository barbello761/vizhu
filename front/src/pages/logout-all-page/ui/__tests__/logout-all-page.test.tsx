import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/shared/api/mocks/server';
import { setAccessToken } from '@/shared/api/token-store';
import * as a11y from '@/shared/lib/a11y';

import { LogoutAllPage } from '..';

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/profile/devices', '/logout-all']} initialIndex={1}>
        <Routes>
          <Route path="/profile/devices" element={<p>Устройства</p>} />
          <Route path="/logout-all" element={<LogoutAllPage />} />
          <Route path="/logout-all/done" element={<p>Вы вышли со всех устройств</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('LogoutAllPage', () => {
  beforeEach(() => {
    setAccessToken('token');
    vi.restoreAllMocks();
  });

  it('подтверждение завершает остальные сеансы и ведёт на результат', async () => {
    const user = userEvent.setup();
    let called = false;
    server.use(
      http.delete('*/auth/sessions/others', () => {
        called = true;
        return HttpResponse.json({ revoked: 2 });
      }),
    );
    renderPage();

    const confirm = screen.getByRole('button', { name: 'Выйти со всех устройств' });
    // Больше не заглушка «в разработке».
    expect(confirm).not.toHaveAttribute('aria-disabled');
    await user.click(confirm);

    expect(await screen.findByText('Вы вышли со всех устройств')).toBeInTheDocument();
    expect(called).toBe(true);
  });

  it('ошибка: остаёмся на экране, причина видна и озвучена', async () => {
    const user = userEvent.setup();
    const announce = vi.spyOn(a11y, 'announceRouteChange');
    server.use(
      http.delete('*/auth/sessions/others', () =>
        HttpResponse.json({ message: 'Что-то пошло не так' }, { status: 500 }),
      ),
    );
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Выйти со всех устройств' }));

    expect(await screen.findByText(/Что-то пошло не так|Не удалось выйти/)).toBeInTheDocument();
    expect(announce).toHaveBeenLastCalledWith(
      expect.stringMatching(/Что-то пошло не так|Не удалось выйти/),
    );
  });

  it('«Отмена» возвращает на «Устройства»', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(screen.getByText('Устройства')).toBeInTheDocument();
  });
});
