import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { DemoNoticePage } from '../DemoNoticePage';

const config = vi.hoisted(() => ({
  env: { isDemo: true, demoOtpCode: '8153' as string | undefined },
}));
vi.mock('@/shared/config', () => config);

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/auth/demo']}>
      <Routes>
        <Route path="/auth/demo" element={<DemoNoticePage />} />
        <Route path="/auth/phone" element={<p>Ввод номера</p>} />
        <Route path="/auth" element={<p>Старт</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe('DemoNoticePage', () => {
  it('рассказывает о демо разделами с заголовками', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Это демо-версия ВИЖУ' }),
    ).toBeInTheDocument();
    for (const name of ['Данные временные', 'Код для входа', 'Звонки волонтёрам']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
  });

  it('показывает запасной код, а скринридеру отдаёт его по цифрам', () => {
    renderPage();

    const visible = screen.getByText('8153');
    expect(visible).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('8 1 5 3')).toHaveClass('visually-hidden');
  });

  it('без кода в сборке не обещает запасной вход', () => {
    config.env.demoOtpCode = undefined;
    renderPage();

    expect(screen.queryByText(/Если звонок не поступил/)).not.toBeInTheDocument();
    config.env.demoOtpCode = '8153';
  });

  it('«Понятно, продолжить» ведёт на ввод номера, «Назад» — на старт', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage();

    await user.click(screen.getByRole('button', { name: 'Понятно, продолжить' }));
    expect(screen.getByText('Ввод номера')).toBeInTheDocument();
    unmount();

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Назад' }));
    expect(screen.getByText('Старт')).toBeInTheDocument();
  });
});
