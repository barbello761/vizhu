import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { Input } from '../Input';

describe('Input', () => {
  it('связывает подпись с полем через htmlFor/id', () => {
    render(<Input label="Номер телефона" />);
    expect(screen.getByLabelText('Номер телефона')).toBeInTheDocument();
  });

  it('пробрасывает ref на нативный input', () => {
    // react-hook-form кладёт ref в register(); в React 19 он приходит
    // обычным пропом и попадает в input через спред.
    const ref = createRef<HTMLInputElement>();
    render(<Input label="Телефон" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('объявляет ошибку и связывает её с полем', () => {
    render(<Input label="Телефон" error="В номере должно быть 11 цифр" />);

    const field = screen.getByLabelText('Телефон');
    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent('В номере должно быть 11 цифр');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAttribute('aria-describedby', alert.id);
  });

  it('без ошибки не выставляет aria-invalid и aria-describedby', () => {
    render(<Input label="Телефон" />);

    const field = screen.getByLabelText('Телефон');
    expect(field).not.toHaveAttribute('aria-invalid');
    expect(field).not.toHaveAttribute('aria-describedby');
  });
});
