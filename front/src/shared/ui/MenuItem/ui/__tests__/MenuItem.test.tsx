import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { MenuItem } from '../MenuItem';

const renderInRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('MenuItem', () => {
  it('ведёт себя как ссылка, когда задан to', () => {
    renderInRouter(<MenuItem icon={<svg />} label="Профиль" to="/profile/settings" />);

    const link = screen.getByRole('link', { name: 'Профиль' });
    expect(link).toHaveAttribute('href', '/profile/settings');
  });

  it('неактивный пункт остаётся в фокусе, помечен aria-disabled и показывает статус', () => {
    renderInRouter(<MenuItem icon={<svg />} label="Премиум-доступ" inactive />);

    const button = screen.getByRole('button', { name: /Премиум-доступ/ });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveTextContent('в разработке');
  });

  it('вызывает onActivate при нажатии на неактивный пункт', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    renderInRouter(
      <MenuItem icon={<svg />} label="Подтвердить ИПРА" inactive onActivate={onActivate} />,
    );

    await user.click(screen.getByRole('button', { name: /Подтвердить ИПРА/ }));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});
