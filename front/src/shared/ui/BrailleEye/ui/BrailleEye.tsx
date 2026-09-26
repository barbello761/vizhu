import { useMemo } from 'react';

import { type BrailleArt, EYE_OFF, EYE_ON } from './braille-eye.art';

/** Сторона холста: та же, что у кнопки в макете. */
const CANVAS = 256;

/** Координаты в ассете хранятся в десятых долях единицы. */
const COORD_SCALE = 0.1;

/**
 * Собирает точки в один `d`: 392 отдельных `<circle>` дали бы столько же узлов
 * в DOM и элементов React на каждый рендер, а рисунок статичный. Арт вписывается
 * в квадрат 256×256 в своём натуральном размере и центрируется, поэтому оба
 * состояния встают на одно место.
 */
const toPath = ({ width, height, radius, dots }: BrailleArt): string => {
  const left = (CANVAS - width) / 2;
  const top = (CANVAS - height) / 2;
  const r = radius;
  const d: string[] = [];

  for (const pair of dots.split(' ')) {
    const [rawX, rawY] = pair.split(',');
    const cx = left + Number(rawX) * COORD_SCALE;
    const cy = top + Number(rawY) * COORD_SCALE;
    // Окружность двумя дугами от левой точки.
    d.push(
      `M${(cx - r).toFixed(2)} ${cy.toFixed(2)}` +
        `a${r} ${r} 0 1 0 ${(r * 2).toFixed(2)} 0` +
        `a${r} ${r} 0 1 0 ${(-r * 2).toFixed(2)} 0`,
    );
  }

  return d.join('');
};

interface BrailleEyeProps {
  /** Перечёркнутый глаз — «не на линии». */
  off?: boolean;
  className?: string;
}

/**
 * Фирменный глаз ВИЖУ, набранный точками, — как рельеф шрифта Брайля.
 * Рисуется `currentColor`, поэтому цвет задаётся снаружи.
 */
export const BrailleEye = ({ off = false, className }: BrailleEyeProps) => {
  const path = useMemo(() => toPath(off ? EYE_OFF : EYE_ON), [off]);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${CANVAS} ${CANVAS}`}
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      aria-hidden="true"
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
};
