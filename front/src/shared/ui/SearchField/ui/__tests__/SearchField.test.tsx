import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SearchField } from '../SearchField';

const Harness = ({ onSubmit = vi.fn() }: { onSubmit?: (value: string) => void }) => {
  const [value, setValue] = useState('');
  return (
    <SearchField
      value={value}
      onChange={setValue}
      onSubmit={onSubmit}
      label="Поиск по истории"
      placeholder="Поиск по истории"
    />
  );
};

describe('SearchField', () => {
  it('объявляет себя областью поиска с именем', () => {
    render(<Harness />);
    expect(screen.getByRole('search', { name: 'Поиск по истории' })).toBeInTheDocument();
  });

  it('связывает имя с полем ввода', () => {
    render(<Harness />);
    expect(screen.getByRole('searchbox', { name: 'Поиск по истории' })).toBeInTheDocument();
  });

  it('отдаёт введённый текст наверх', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByRole('searchbox'), 'нурофен');

    expect(screen.getByRole('searchbox')).toHaveValue('нурофен');
  });

  it('подтверждает запрос кнопкой', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByRole('searchbox'), 'меню');
    await user.click(screen.getByRole('button', { name: 'Найти' }));

    expect(onSubmit).toHaveBeenCalledWith('меню');
  });

  it('подтверждает запрос по Enter, не перезагружая страницу', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByRole('searchbox'), 'купюра{Enter}');

    expect(onSubmit).toHaveBeenCalledWith('купюра');
  });
});
