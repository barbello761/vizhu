import { useMemo } from 'react';

import './MockQr.scss';

interface MockQrProps {
  /** Значение-семя: одинаковое `value` даёт одинаковый рисунок. */
  value: string;
  /** Число модулей по стороне (нечётное). */
  modules?: number;
  /** Доступное имя. QR — декоративная заглушка, ссылка рядом доступна текстом. */
  label?: string;
  className?: string;
}

const fnv1a = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

/** mulberry32 — компактный детерминированный ГПСЧ. */
const makeRandom = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const isFinderZone = (row: number, col: number, size: number): boolean => {
  const inCorner = (r0: number, c0: number) =>
    row >= r0 && row < r0 + 7 && col >= c0 && col < c0 + 7;
  return inCorner(0, 0) || inCorner(0, size - 7) || inCorner(size - 7, 0);
};

const finderModule = (row: number, col: number, size: number): boolean => {
  const local = (r0: number, c0: number) => {
    const r = row - r0;
    const c = col - c0;
    const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
    return ring !== 2; // рамка 7×7 с зазором и центром 3×3
  };
  if (row < 7 && col < 7) {
    return local(0, 0);
  }
  if (row < 7 && col >= size - 7) {
    return local(0, size - 7);
  }
  return local(size - 7, 0);
};

/**
 * Визуальная заглушка QR-кода: детерминированный узор из `value`. Не рабочий QR —
 * рядом всегда показывается та же ссылка обычным текстом с кнопкой «Копировать».
 */
export const MockQr = ({
  value,
  modules = 25,
  label = 'QR-код со ссылкой-приглашением',
  className,
}: MockQrProps) => {
  const size = modules % 2 === 0 ? modules + 1 : modules;

  const cells = useMemo(() => {
    const random = makeRandom(fnv1a(value));
    const result: { x: number; y: number }[] = [];
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const filled = isFinderZone(row, col, size)
          ? finderModule(row, col, size)
          : random() > 0.52;
        if (filled) {
          result.push({ x: col, y: row });
        }
      }
    }
    return result;
  }, [value, size]);

  return (
    <svg
      className={['mock-qr', className].filter(Boolean).join(' ')}
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x={-2} y={-2} width={size + 4} height={size + 4} fill="var(--bg-page)" />
      {cells.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  );
};
