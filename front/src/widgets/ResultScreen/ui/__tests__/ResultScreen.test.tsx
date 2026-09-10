import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ResultScreen } from '../ResultScreen';

describe('ResultScreen', () => {
  it('показывает заголовок, описание и единственную кнопку', () => {
    render(
      <ResultScreen
        title={'Вы вышли\nиз аккаунта'}
        description="Перейдите на стартовый экран."
        onDone={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /Вы вышли\s+из аккаунта/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Перейдите на стартовый экран.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Готово' })).toBeInTheDocument();
  });

  it('поддерживает свою подпись кнопки и зовёт onDone', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(
      <ResultScreen title="Готово" description="…" actionLabel="На главный" onDone={onDone} />,
    );

    await user.click(screen.getByRole('button', { name: 'На главный' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
