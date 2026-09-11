import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TextTile } from '../TextTile';

describe('TextTile', () => {
  it('рендерит секцию с собственным заголовком и телом', () => {
    render(
      <TextTile title="Бесплатный доступ">
        <p>Есть суточные ограничения</p>
      </TextTile>,
    );

    const heading = screen.getByRole('heading', { level: 2, name: 'Бесплатный доступ' });
    expect(heading).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Бесплатный доступ' })).toContainElement(
      screen.getByText('Есть суточные ограничения'),
    );
  });

  it('уважает уровень заголовка', () => {
    render(
      <TextTile title="Полный доступ" headingLevel={3}>
        <p>Активна подписка</p>
      </TextTile>,
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Полный доступ' })).toBeInTheDocument();
  });
});
