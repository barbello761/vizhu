import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ActionLink } from '../ActionLink';

describe('ActionLink', () => {
  it('внешняя ссылка открывается в новой вкладке с безопасным rel', () => {
    render(
      <ActionLink href="https://t.me/bosicoChan" variant="tertiary">
        Связаться с нами
      </ActionLink>,
    );

    const link = screen.getByRole('link', { name: 'Связаться с нами' });
    expect(link).toHaveAttribute('href', 'https://t.me/bosicoChan');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveClass('btn-v2', 'btn-v2--tertiary');
  });

  it('внутренняя ссылка рендерится как роутовый переход без target', () => {
    render(
      <MemoryRouter>
        <ActionLink to="/about">О приложении</ActionLink>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'О приложении' });
    expect(link).toHaveAttribute('href', '/about');
    expect(link).not.toHaveAttribute('target');
  });
});
