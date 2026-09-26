import { type ReactNode } from 'react';

import './Alert.scss';

interface AlertProps {
  /** Иконка 32×32 в слоте слева. */
  icon: ReactNode;
  children: ReactNode;
  /** `danger` — ошибка/предупреждение (по умолчанию), `info` — нейтральное. */
  tone?: 'danger' | 'info';
  /**
   * Объявлять ли текст скринридеру при появлении/смене.
   * По умолчанию да: `role="alert"` для `danger`, `role="status"` для `info`.
   */
  live?: boolean;
  className?: string;
}

/** Инлайновая плашка-предупреждение: иконка + текст. */
export const Alert = ({ icon, children, tone = 'danger', live = true, className }: AlertProps) => {
  const cls = ['alert-v2', `alert-v2--${tone}`, className].filter(Boolean).join(' ');
  const role = live ? (tone === 'danger' ? 'alert' : 'status') : undefined;

  return (
    <p className={cls} role={role}>
      <span className="alert-v2__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="alert-v2__text">{children}</span>
    </p>
  );
};
