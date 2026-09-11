import { type ButtonHTMLAttributes, type ReactNode } from 'react';

import './CamButton.scss';

interface CamButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /**
   * `control` — круглая кнопка с иконкой в слоте;
   * `shutter` — затвор с диском внутри кольца, содержимое не принимает.
   */
  variant?: 'control' | 'shutter';
  /**
   * Тон обводки и иконки:
   * `neutral` — белая (по умолчанию), `active` — голубая (включённое состояние),
   * `danger` — красная (завершение звонка).
   */
  tone?: 'neutral' | 'active' | 'danger';
  /** Размер: `l` — 72 (по умолчанию), `xl` — 96. */
  size?: 'l' | 'xl';
  /** Кнопки этого типа всегда без подписи, поэтому имя обязательно. */
  'aria-label': string;
  children?: ReactNode;
}

export const CamButton = ({
  variant = 'control',
  tone = 'neutral',
  size = 'l',
  children,
  className,
  type = 'button',
  ...nativeProps
}: CamButtonProps) => {
  const cls = [
    'cam-button',
    `cam-button--${variant}`,
    tone !== 'neutral' && `cam-button--${tone}`,
    size === 'xl' && 'cam-button--xl',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button {...nativeProps} type={type} className={cls}>
      {variant === 'shutter' ? <span className="cam-button__disc" aria-hidden="true" /> : children}
    </button>
  );
};
