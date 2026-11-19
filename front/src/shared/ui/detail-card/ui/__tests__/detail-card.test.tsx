import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DetailCard } from '..';

describe('DetailCard', () => {
  it('заголовок нужного уровня и строки подробностей, иконка скрыта', () => {
    const { container } = render(
      <DetailCard
        icon={<svg data-testid="icon" />}
        title="Pixel 7"
        details={['Приложение ВИЖУ', 'Вход: 12 ноября']}
      />,
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Pixel 7' })).toBeInTheDocument();
    expect(screen.getByText('Приложение ВИЖУ')).toBeInTheDocument();
    expect(screen.getByText('Вход: 12 ноября')).toBeInTheDocument();
    expect(container.querySelector('.detail-card__icon')).toHaveAttribute('aria-hidden', 'true');
  });

  it('без action в карточке нечего фокусировать', () => {
    render(<DetailCard icon={null} title="Pixel 7" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('action получает id заголовка — на него можно сослаться из подписи', () => {
    render(
      <DetailCard
        icon={null}
        title="Pixel 7"
        titleAs="h2"
        action={(titleId) => (
          <button type="button" aria-describedby={titleId}>
            Завершить сеанс
          </button>
        )}
      />,
    );

    expect(screen.getByRole('button', { name: 'Завершить сеанс' })).toHaveAccessibleDescription(
      'Pixel 7',
    );
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });
});
