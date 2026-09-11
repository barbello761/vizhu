import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Alert } from '../Alert';

describe('Alert', () => {
  it('danger-плашка объявляется как alert', () => {
    render(<Alert icon={<svg />}>Нестабильное соединение</Alert>);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Нестабильное соединение');
    expect(alert).toHaveClass('alert-v2--danger');
  });

  it('info-плашка объявляется как status', () => {
    render(
      <Alert icon={<svg />} tone="info">
        Подсказка
      </Alert>,
    );

    expect(screen.getByRole('status')).toHaveClass('alert-v2--info');
  });

  it('с live=false не создаёт живой регион', () => {
    render(
      <Alert icon={<svg />} live={false}>
        Тихо
      </Alert>,
    );

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Тихо')).toBeInTheDocument();
  });
});
