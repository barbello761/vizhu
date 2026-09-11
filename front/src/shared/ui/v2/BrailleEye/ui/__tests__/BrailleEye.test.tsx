import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EYE_OFF, EYE_ON } from '../braille-eye.art';
import { BrailleEye } from '../BrailleEye';

const pathOf = (container: HTMLElement) => container.querySelector('path')?.getAttribute('d') ?? '';

/** Каждая точка — одна команда `M`, так что их число равно числу пар в арте. */
const dotsIn = (art: { dots: string }) => art.dots.split(' ').length;

describe('BrailleEye', () => {
  it('рисует ровно столько точек, сколько их в арте открытого глаза', () => {
    const { container } = render(<BrailleEye />);

    expect(pathOf(container).split('M').length - 1).toBe(dotsIn(EYE_ON));
  });

  it('в состоянии off берёт арт перечёркнутого глаза', () => {
    const { container } = render(<BrailleEye off />);

    expect(pathOf(container).split('M').length - 1).toBe(dotsIn(EYE_OFF));
  });

  it('арт вписан в холст: ни одна точка не вылезает за его границы', () => {
    const { container } = render(<BrailleEye />);
    const coords = [...pathOf(container).matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)].flatMap((m) => [
      Number(m[1]),
      Number(m[2]),
    ]);

    expect(Math.min(...coords)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...coords)).toBeLessThanOrEqual(256);
  });

  it('декоративный: скрыт от скринридера и не ловит фокус', () => {
    const { container } = render(<BrailleEye />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  });
});
