import { type ButtonHTMLAttributes, type ReactNode } from 'react';

import { Spinner } from '../../Spinner';

import './Button.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'icon';

interface SharedProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  loading?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  /**
   * Кнопка стоит на акцентном (синем) фоне: белая заливка, акцентный текст,
   * фокус-ринг под тёмную подложку. Используется на экране поиска волонтёра.
   */
  onAccent?: boolean;
}

interface LabelledProps extends SharedProps {
  variant?: Exclude<ButtonVariant, 'icon'>;
}

interface IconOnlyProps extends SharedProps {
  variant: 'icon';
  'aria-label': string;
}

export type ButtonProps = LabelledProps | IconOnlyProps;

export const Button = ({
  variant = 'primary',
  loading = false,
  onAccent = false,
  children,
  startIcon,
  endIcon,
  className,
  disabled = false,
  type = 'button',
  ...nativeProps
}: ButtonProps) => {
  const isIconOnly = variant === 'icon';

  const cls = [
    'btn-v2',
    `btn-v2--${variant}`,
    loading && 'btn-v2--loading',
    onAccent && 'btn-v2--on-accent',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const renderContent = () => {
    if (loading) {
      return <Spinner />;
    }

    if (isIconOnly) {
      return children;
    }

    return (
      <>
        <span className="btn-v2__slot" aria-hidden="true">
          {startIcon}
        </span>
        <span className="btn-v2__label">{children}</span>
        <span className="btn-v2__slot" aria-hidden="true">
          {endIcon}
        </span>
      </>
    );
  };

  return (
    <button
      {...nativeProps}
      type={type}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {renderContent()}
    </button>
  );
};
