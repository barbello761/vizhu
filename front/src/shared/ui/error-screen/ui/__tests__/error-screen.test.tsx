import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ErrorScreen } from '..';

const MESSAGE = 'Отсутствует соединение с сервером. Проверьте своё подключение и попробуйте снова.';

describe('ErrorScreen', () => {
  it('озвучивает текст с кодом сразу при появлении (role=alert)', () => {
    render(<ErrorScreen message={MESSAGE} code="503" onRetry={vi.fn()} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(MESSAGE);
    expect(alert).toHaveTextContent('(Код ошибки: 503)');
  });

  it('без кода строку с кодом не рисует', () => {
    render(<ErrorScreen message={MESSAGE} onRetry={vi.fn()} />);

    expect(screen.getByRole('alert')).not.toHaveTextContent('Код ошибки');
  });

  it('у экрана есть имя для скринридера, хотя видимого заголовка нет', () => {
    render(<ErrorScreen message={MESSAGE} title="Нет соединения" onRetry={vi.fn()} />);

    expect(screen.getByRole('main', { name: 'Нет соединения' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Нет соединения' })).toBeInTheDocument();
  });

  it('в режиме main забирает фокус — на месте упавшего экрана его уже нет', () => {
    render(<ErrorScreen message={MESSAGE} onRetry={vi.fn()} />);

    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('в режиме div не создаёт второй <main> с id main-content', () => {
    const { container } = render(<ErrorScreen as="div" message={MESSAGE} onRetry={vi.fn()} />);

    expect(screen.queryByRole('main')).not.toBeInTheDocument();
    expect(container.querySelector('#main-content')).toBeNull();
  });

  it('«Попробовать снова» зовёт onRetry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorScreen message={MESSAGE} onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Попробовать снова' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('во время повтора кнопка занята и второй раз не нажимается', () => {
    render(<ErrorScreen message={MESSAGE} retrying onRetry={vi.fn()} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
