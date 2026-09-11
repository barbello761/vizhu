import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Notice } from '../Notice';

describe('Notice', () => {
  it('показывает текст пояснения', () => {
    render(<Notice>Функционал в разработке, ссылки недействительны</Notice>);

    expect(screen.getByText('Функционал в разработке, ссылки недействительны')).toBeInTheDocument();
  });

  it('не создаёт остановок фокуса — внутри нет интерактивных элементов', () => {
    const { container } = render(<Notice>В разработке</Notice>);

    expect(container.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0);
  });

  it('не является живым регионом: это статичная подпись, а не событие', () => {
    const { container } = render(<Notice>В разработке</Notice>);

    expect(container.firstElementChild).not.toHaveAttribute('role');
    expect(container.firstElementChild).not.toHaveAttribute('aria-live');
  });
});
