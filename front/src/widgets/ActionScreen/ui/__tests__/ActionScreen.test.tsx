import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ActionScreen } from '../ActionScreen';

const setup = (overrides = {}) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ActionScreen
      title={'Выйти\nиз аккаунта?'}
      description="Вы сможете войти снова."
      confirmLabel="Выйти из аккаунта"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onConfirm, onCancel };
};

describe('ActionScreen', () => {
  it('показывает заголовок c переносом, описание и две кнопки', () => {
    setup();
    expect(
      screen.getByRole('heading', { level: 1, name: /Выйти\s+из аккаунта\?/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Вы сможете войти снова.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Выйти из аккаунта' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeInTheDocument();
  });

  it('вызывает onConfirm и onCancel по нажатию кнопок', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = setup();

    await user.click(screen.getByRole('button', { name: 'Выйти из аккаунта' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('при confirmDisabled помечает главную кнопку aria-disabled, но оставляет в фокусе', async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup({ confirmDisabled: true });

    const confirm = screen.getByRole('button', { name: 'Выйти из аккаунта' });
    expect(confirm).toHaveAttribute('aria-disabled', 'true');
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1); // реакция на клик — на стороне страницы
  });

  it('main подписан заголовком экрана', () => {
    setup();
    expect(screen.getByRole('main')).toHaveAccessibleName(/Выйти\s+из аккаунта\?/);
  });

  it('без onBack кнопки «назад» нет', () => {
    setup();

    expect(screen.queryByRole('button', { name: 'Назад' })).not.toBeInTheDocument();
  });

  it('с onBack рисует кнопку «назад» и зовёт обработчик', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    setup({ onBack, backLabel: 'Назад, к вводу почты' });

    await user.click(screen.getByRole('button', { name: 'Назад, к вводу почты' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
