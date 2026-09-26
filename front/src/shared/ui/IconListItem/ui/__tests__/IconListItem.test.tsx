import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { IconListItem } from '../IconListItem';

const renderInRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('IconListItem', () => {
  it('рендерит ссылку, когда задан to', () => {
    renderInRouter(<IconListItem label="Светлана" icon={<svg />} to="/call/waiting?contact=x" />);

    const link = screen.getByRole('link', { name: 'Светлана' });
    expect(link).toHaveAttribute('href', '/call/waiting?contact=x');
  });

  it('рендерит кнопку-действие с onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderInRouter(<IconListItem label="Ваня" icon={<svg />} onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: 'Ваня' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('неактивная строка помечена aria-disabled, озвучивает статус и зовёт onActivate', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    renderInRouter(
      <IconListItem
        label="Серёжа внук"
        icon={<svg />}
        inactive
        hint="звонок близким в разработке"
        onActivate={onActivate}
      />,
    );

    const button = screen.getByRole('button', { name: /Серёжа внук/ });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveTextContent('звонок близким в разработке');

    await user.click(button);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});
