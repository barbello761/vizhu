import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CodeInput } from '../CodeInput';

const Harness = ({
  onChange = vi.fn(),
  onComplete,
  onSubmit,
  error,
}: {
  onChange?: (v: string) => void;
  onComplete?: (v: string) => void;
  onSubmit?: () => void;
  error?: string;
}) => {
  const [value, setValue] = useState('');
  return (
    <CodeInput
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
      onComplete={onComplete}
      onSubmit={onSubmit}
      label="Код из СМС, 4 цифры"
      error={error}
    />
  );
};

const cells = () => screen.getAllByRole('textbox');

describe('CodeInput', () => {
  it('рендерит клетки с порядковыми подписями внутри группы', () => {
    render(<Harness />);
    expect(screen.getByRole('group', { name: 'Код из СМС, 4 цифры' })).toBeInTheDocument();
    expect(cells()).toHaveLength(4);
    expect(screen.getByRole('textbox', { name: 'Цифра 1 из 4' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Цифра 4 из 4' })).toBeInTheDocument();
  });

  it('переводит фокус на следующую клетку при вводе цифры', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(cells()[0]);
    await user.keyboard('1');

    expect(cells()[0]).toHaveValue('1');
    expect(cells()[1]).toHaveFocus();
  });

  it('собирает код целиком при последовательном вводе', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(cells()[0]);
    await user.keyboard('1234');

    expect(onChange).toHaveBeenLastCalledWith('1234');
  });

  it('игнорирует нецифровой ввод', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(cells()[0]);
    await user.keyboard('a');

    expect(cells()[0]).toHaveValue('');
  });

  it('Backspace на пустой клетке стирает предыдущую и встаёт на неё', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(cells()[0]);
    await user.keyboard('12');
    await user.keyboard('{Backspace}');

    expect(cells()[1]).toHaveValue('');
    expect(cells()[0]).toHaveValue('1');
    expect(cells()[1]).toHaveFocus();
  });

  it('удаление в середине сдвигает цифры влево, не оставляя дырок', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(cells()[0]);
    await user.keyboard('1234');
    await user.click(cells()[1]);
    await user.keyboard('{Backspace}');

    expect(onChange).toHaveBeenLastCalledWith('134');
    expect(cells()[0]).toHaveValue('1');
    expect(cells()[1]).toHaveValue('3');
    expect(cells()[2]).toHaveValue('4');
    expect(cells()[3]).toHaveValue('');
  });

  it('клик по клетке за первой пустой возвращает фокус на первую пустую', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(cells()[0]);
    await user.keyboard('1');
    await user.click(cells()[3]);

    expect(cells()[1]).toHaveFocus();
  });

  it('вставка из буфера заполняет клетки и отбрасывает лишнее', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(cells()[0]);
    await user.paste('12-345');

    expect(onChange).toHaveBeenLastCalledWith('1234');
  });

  it('показывает ошибку как alert и связывает её с клетками', () => {
    render(<Harness error="Неверный код" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Неверный код');
    expect(cells()[0]).toHaveAttribute('aria-invalid', 'true');
    expect(cells()[0]).toHaveAttribute('aria-describedby', alert.id);
  });

  it('зовёт onComplete ровно один раз — на последней цифре', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);

    await user.click(cells()[0]);
    await user.keyboard('043');
    expect(onComplete).not.toHaveBeenCalled();

    await user.keyboard('4');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('0434');
  });

  it('зовёт onComplete и при вставке кода целиком', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);

    await user.click(cells()[0]);
    await user.paste('4321');

    expect(onComplete).toHaveBeenCalledWith('4321');
  });

  it('Enter в клетке зовёт onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.click(cells()[0]);
    await user.keyboard('12{Enter}');

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
