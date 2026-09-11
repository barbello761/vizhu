import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CamButton } from '../CamButton';

describe('CamButton', () => {
  it('control по умолчанию — 72, нейтральный тон, рендерит слот с иконкой', () => {
    render(
      <CamButton aria-label="Микрофон">
        <svg data-testid="glyph" />
      </CamButton>,
    );

    const btn = screen.getByRole('button', { name: 'Микрофон' });
    expect(btn).toHaveClass('cam-button', 'cam-button--control');
    expect(btn).not.toHaveClass('cam-button--danger', 'cam-button--xl');
    expect(screen.getByTestId('glyph')).toBeInTheDocument();
  });

  it('tone="danger" size="xl" навешивает модификаторы (кнопка «Завершить»)', () => {
    render(
      <CamButton aria-label="Завершить звонок" tone="danger" size="xl">
        <svg />
      </CamButton>,
    );

    expect(screen.getByRole('button', { name: 'Завершить звонок' })).toHaveClass(
      'cam-button--danger',
      'cam-button--xl',
    );
  });

  it('shutter не принимает содержимое и рисует диск', () => {
    const { container } = render(<CamButton variant="shutter" aria-label="Снять" />);

    expect(container.querySelector('.cam-button__disc')).not.toBeNull();
  });
});
