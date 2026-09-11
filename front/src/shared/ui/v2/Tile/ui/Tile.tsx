import { type ReactNode } from 'react';
import { Link } from 'react-router';

import './Tile.scss';

interface TileProps {
  /** Иллюстрация 96×96 — рендерится в слоте фиксированного размера. */
  icon: ReactNode;
  /** Подпись под иллюстрацией. Перенос строки из макета передаётся как `\n`. */
  label: string;
  to: string;
  /** Доступное имя, если подписи недостаточно. */
  ariaLabel?: string;
  className?: string;
}

export const Tile = ({ icon, label, to, ariaLabel, className }: TileProps) => (
  <Link to={to} className={['tile', className].filter(Boolean).join(' ')} aria-label={ariaLabel}>
    <span className="tile__slot" aria-hidden="true">
      {icon}
    </span>
    <span className="tile__label">{label}</span>
  </Link>
);
