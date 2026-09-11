import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '../Button';

describe('Button', () => {
  it('onAccent добавляет класс для акцентного фона', () => {
    render(<Button onAccent>Отмена</Button>);

    expect(screen.getByRole('button', { name: 'Отмена' })).toHaveClass('btn-v2--on-accent');
  });

  it('tertiary + onAccent сочетает оба класса (второстепенная кнопка на синем фоне)', () => {
    render(
      <Button variant="tertiary" onAccent>
        Отклонить
      </Button>,
    );

    const btn = screen.getByRole('button', { name: 'Отклонить' });
    expect(btn).toHaveClass('btn-v2--tertiary');
    expect(btn).toHaveClass('btn-v2--on-accent');
  });

  it('loading блокирует кнопку и выставляет aria-busy', () => {
    render(<Button loading>Отправить</Button>);

    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });
});
