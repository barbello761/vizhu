import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ActionMenuItem, PencilIcon } from '@/shared/ui/v2';

import { HistoryItem } from '../HistoryItem';

const ITEM = {
  title: 'Что на упаковке лекарства',
  dateLabel: 'Сегодня',
  time: '09:14',
};

const renderItem = (overrides: Partial<Parameters<typeof HistoryItem>[0]> = {}) =>
  render(
    <ul>
      <HistoryItem
        {...ITEM}
        onOpen={vi.fn()}
        menuItems={(close) => (
          <ActionMenuItem icon={<PencilIcon />} onClick={close}>
            Переименовать чат
          </ActionMenuItem>
        )}
        {...overrides}
      />
    </ul>,
  );

describe('HistoryItem', () => {
  it('открывает запись кнопкой с заголовком, датой и временем', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    renderItem({ onOpen });

    await user.click(
      screen.getByRole('button', { name: 'Что на упаковке лекарства. Сегодня, 09:14' }),
    );

    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('кнопка меню объявляет своё состояние и адрес меню', async () => {
    const user = userEvent.setup();
    renderItem();

    const more = screen.getByRole('button', { name: /Действия с записью/ });
    expect(more).toHaveAttribute('aria-expanded', 'false');

    await user.click(more);

    expect(more).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('list', { name: /Действия с записью/ });
    expect(more).toHaveAttribute('aria-controls', menu.id);
  });

  it('Escape закрывает меню и возвращает фокус на кнопку', async () => {
    const user = userEvent.setup();
    renderItem();

    const more = screen.getByRole('button', { name: /Действия с записью/ });
    await user.click(more);
    await user.keyboard('{Escape}');

    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(more).toHaveFocus();
  });

  it('пункт меню может закрыть меню сам', async () => {
    const user = userEvent.setup();
    renderItem();

    await user.click(screen.getByRole('button', { name: /Действия с записью/ }));
    await user.click(screen.getByRole('button', { name: 'Переименовать чат' }));

    expect(screen.queryByRole('list', { name: /Действия с записью/ })).not.toBeInTheDocument();
  });

  it('в режиме правки показывает поле с текущим названием и сохраняет его', async () => {
    const user = userEvent.setup();
    const onRenameSubmit = vi.fn();

    const Harness = () => {
      const [isRenaming, setIsRenaming] = useState(true);
      return (
        <ul>
          <HistoryItem
            {...ITEM}
            onOpen={vi.fn()}
            menuItems={() => null}
            isRenaming={isRenaming}
            onRenameSubmit={(title) => {
              onRenameSubmit(title);
              setIsRenaming(false);
            }}
            onRenameCancel={() => setIsRenaming(false)}
          />
        </ul>
      );
    };

    render(<Harness />);

    const field = screen.getByRole('textbox', { name: /Новое название записи/ });
    expect(field).toHaveValue(ITEM.title);

    await user.clear(field);
    await user.type(field, 'Упаковка нурофена');
    await user.click(screen.getByRole('button', { name: 'Сохранить название' }));

    expect(onRenameSubmit).toHaveBeenCalledWith('Упаковка нурофена');
  });

  it('Escape в поле правки отменяет переименование', async () => {
    const user = userEvent.setup();
    const onRenameCancel = vi.fn();
    renderItem({ isRenaming: true, onRenameSubmit: vi.fn(), onRenameCancel });

    await user.keyboard('{Escape}');

    expect(onRenameCancel).toHaveBeenCalledOnce();
  });
});
