import { type ButtonHTMLAttributes, type ReactNode } from 'react';

import './CamButton.scss';

interface CamButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /**
   * `control` — 72×72, в слот кладётся иконка 32×32;
   * `shutter` — 96×96 с диском внутри кольца, содержимое не принимает.
   */
  variant?: 'control' | 'shutter';
  /** Кнопки этого типа всегда без подписи, поэтому имя обязательно. */
  'aria-label': string;
  children?: ReactNode;
}

export const CamButton = ({
  variant = 'control',
  children,
  className,
  type = 'button',
  ...nativeProps
}: CamButtonProps) => {
  const cls = ['cam-button', `cam-button--${variant}`, className].filter(Boolean).join(' ');

  return (
    <button {...nativeProps} type={type} className={cls}>
      {variant === 'shutter' ? <span className="cam-button__disc" aria-hidden="true" /> : children}
    </button>
  );
};
