import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from '../Checkbox';

const Harness = ({ onToggle = vi.fn() }: { onToggle?: (checked: boolean) => void }) => {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox
      checked={checked}
      onChange={(event) => {
        setChecked(event.target.checked);
        onToggle(event.target.checked);
      }}
    >
      Согласен с <span>Политикой обработки персональных данных</span>
    </Checkbox>
  );
};

describe('Checkbox', () => {
  it('доступен как чекбокс с подписью из содержимого', () => {
    render(<Harness />);
    expect(
      screen.getByRole('checkbox', {
        name: 'Согласен с Политикой обработки персональных данных',
      }),
    ).toBeInTheDocument();
  });

  it('переключается кликом по подписи, а не только по квадрату', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<Harness onToggle={onToggle} />);

    await user.click(screen.getByText('Политикой обработки персональных данных'));

    expect(onToggle).toHaveBeenCalledWith(true);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('переключается с клавиатуры пробелом', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    expect(screen.getByRole('checkbox')).toHaveFocus();

    await user.keyboard(' ');
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('не переключается в disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Checkbox disabled onChange={onChange}>
        Согласен
      </Checkbox>,
    );

    await user.click(screen.getByText('Согласен'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
