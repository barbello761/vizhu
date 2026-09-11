import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OnlineToggle } from '../OnlineToggle';

describe('OnlineToggle', () => {
  it('offline: доступное имя — действие «встать на линию», aria-pressed=false', () => {
    render(<OnlineToggle online={false} onToggle={vi.fn()} />);

    const btn = screen.getByRole('button', { name: 'Встать на линию' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('online: доступное имя — действие «уйти с линии», aria-pressed=true', () => {
    render(<OnlineToggle online onToggle={vi.fn()} />);

    const btn = screen.getByRole('button', { name: 'Уйти с линии' });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('вызывает onToggle по нажатию', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<OnlineToggle online={false} onToggle={onToggle} />);

    await user.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
