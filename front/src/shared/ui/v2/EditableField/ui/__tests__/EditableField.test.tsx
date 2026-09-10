import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { EditableField } from '../EditableField';

interface HarnessProps {
  onSave?: (next: string) => Promise<void> | void;
  validate?: (next: string) => string | null;
  initial?: string;
}

const Harness = ({ onSave = vi.fn(), validate, initial = 'Ваня' }: HarnessProps) => {
  const [value, setValue] = useState(initial);
  return (
    <EditableField
      label="Имя"
      value={value}
      validate={validate}
      onSave={async (next) => {
        await onSave(next);
        setValue(next);
      }}
    />
  );
};

describe('EditableField', () => {
  it('показывает подпись, значение и кнопку правки', () => {
    render(<Harness />);

    expect(screen.getByText('Имя')).toBeInTheDocument();
    expect(screen.getByText('Ваня')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Изменить: Имя' })).toBeInTheDocument();
  });

  it('по карандашу открывает поле с текущим значением и фокусом', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Изменить: Имя' }));

    const input = screen.getByRole('textbox', { name: 'Имя' });
    expect(input).toHaveValue('Ваня');
    expect(input).toHaveFocus();
  });

  it('сохраняет обрезанное значение и возвращает фокус на карандаш', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Изменить: Имя' }));
    const input = screen.getByRole('textbox', { name: 'Имя' });
    await user.clear(input);
    await user.type(input, '  Пётр  ');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(onSave).toHaveBeenCalledWith('Пётр');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Изменить: Имя' })).toHaveFocus(),
    );
    expect(screen.getByText('Пётр')).toBeInTheDocument();
  });

  it('не сохраняет при ошибке валидации и показывает её', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Harness onSave={onSave} validate={(v) => (v ? null : 'Введите имя')} />);

    await user.click(screen.getByRole('button', { name: 'Изменить: Имя' }));
    await user.clear(screen.getByRole('textbox', { name: 'Имя' }));
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Введите имя');
    expect(screen.getByRole('textbox', { name: 'Имя' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('Escape отменяет правку без сохранения', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Изменить: Имя' }));
    await user.type(screen.getByRole('textbox', { name: 'Имя' }), 'xxx');
    await user.keyboard('{Escape}');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Ваня')).toBeInTheDocument();
  });

  it('при ошибке сохранения остаётся в правке и сообщает об этом', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('network'));
    render(<Harness onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Изменить: Имя' }));
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/не удалось сохранить/i);
    expect(screen.getByRole('textbox', { name: 'Имя' })).toBeInTheDocument();
  });
});
