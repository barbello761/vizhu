import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SegmentedControl } from '../SegmentedControl';

const OPTIONS = [
  { value: 'chats', label: 'Чаты' },
  { value: 'calls', label: 'Звонки' },
] as const;

const Harness = ({ onChange = vi.fn() }: { onChange?: (value: string) => void }) => {
  const [value, setValue] = useState<'chats' | 'calls'>('chats');
  return (
    <SegmentedControl
      aria-label="Раздел истории"
      options={OPTIONS}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
};

describe('SegmentedControl', () => {
  it('объявляет группу вкладок и отмечает выбранную', () => {
    render(<Harness />);

    expect(screen.getByRole('tablist', { name: 'Раздел истории' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Чаты' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Звонки' })).toHaveAttribute('aria-selected', 'false');
  });

  it('переключает раздел кликом', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole('tab', { name: 'Звонки' }));

    expect(onChange).toHaveBeenCalledWith('calls');
    expect(screen.getByRole('tab', { name: 'Звонки' })).toHaveAttribute('aria-selected', 'true');
  });

  it('занимает одну остановку Tab: фокус получает выбранная вкладка', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();

    expect(screen.getByRole('tab', { name: 'Чаты' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Звонки' })).toHaveAttribute('tabindex', '-1');
  });

  it('переключает раздел стрелками и переносит фокус', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    await user.keyboard('{ArrowRight}');

    const calls = screen.getByRole('tab', { name: 'Звонки' });
    expect(calls).toHaveFocus();
    expect(calls).toHaveAttribute('aria-selected', 'true');
  });

  it('стрелка вправо с последней вкладки возвращает на первую', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    await user.keyboard('{ArrowRight}{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Чаты' })).toHaveFocus();
  });

  it('связывает вкладку с панелью через aria-controls', () => {
    render(
      <SegmentedControl
        aria-label="Раздел истории"
        options={[
          { value: 'chats', label: 'Чаты', controls: 'panel-chats' },
          { value: 'calls', label: 'Звонки', controls: 'panel-calls' },
        ]}
        value="chats"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Чаты' })).toHaveAttribute(
      'aria-controls',
      'panel-chats',
    );
  });
});
