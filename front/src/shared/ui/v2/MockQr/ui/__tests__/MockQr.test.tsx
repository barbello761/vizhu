import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MockQr } from '../MockQr';

const modulesOf = (container: HTMLElement) =>
  container.querySelectorAll('rect[fill="currentColor"]').length;

describe('MockQr', () => {
  it('доступен как изображение с понятным именем', () => {
    const { getByRole } = render(<MockQr value="https://vizhu.app/invite/8k2Qx" />);
    expect(getByRole('img')).toHaveAccessibleName('QR-код со ссылкой-приглашением');
  });

  it('детерминирован: одинаковое value даёт одинаковый узор', () => {
    const a = render(<MockQr value="seed-1" />);
    const b = render(<MockQr value="seed-1" />);
    expect(a.container.querySelector('svg')?.innerHTML).toBe(
      b.container.querySelector('svg')?.innerHTML,
    );
  });

  it('разные value дают разный узор', () => {
    const a = render(<MockQr value="seed-1" />);
    const b = render(<MockQr value="seed-2" />);
    expect(a.container.querySelector('svg')?.innerHTML).not.toBe(
      b.container.querySelector('svg')?.innerHTML,
    );
  });

  it('рисует хотя бы позиционирующие квадраты', () => {
    const { container } = render(<MockQr value="x" />);
    expect(modulesOf(container)).toBeGreaterThan(20);
  });
});
