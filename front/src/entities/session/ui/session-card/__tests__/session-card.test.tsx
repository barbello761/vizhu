import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SessionCard } from '..';
import type { Session } from '../../../api';

const NOW = new Date(2026, 10, 19, 18, 0);

const SESSION: Session = {
  id: 's-1',
  deviceName: 'Chrome, Windows',
  client: 'web',
  platform: 'windows',
  createdAt: new Date(2026, 10, 12, 9, 0).toISOString(),
  lastActiveAt: new Date(2026, 10, 19, 15, 0).toISOString(),
};

describe('SessionCard', () => {
  it('другой сеанс: устройство, клиент и последняя активность', () => {
    render(<SessionCard session={SESSION} now={NOW} />);

    expect(screen.getByRole('heading', { name: 'Chrome, Windows' })).toBeInTheDocument();
    expect(screen.getByText('Веб-версия')).toBeInTheDocument();
    expect(screen.getByText(/Активность:/)).toHaveTextContent('Активность: 3 часа назад');
  });

  it('текущий сеанс показывает дату входа, а не активность', () => {
    render(<SessionCard session={SESSION} current now={NOW} />);

    expect(screen.getByText(/Вход:/)).toHaveTextContent('Вход: 12 ноября');
    expect(screen.queryByText(/Активность:/)).not.toBeInTheDocument();
  });

  it('время размечено машиночитаемо', () => {
    const { container } = render(<SessionCard session={SESSION} now={NOW} />);
    expect(container.querySelector('time')).toHaveAttribute('datetime', SESSION.lastActiveAt);
  });
});
