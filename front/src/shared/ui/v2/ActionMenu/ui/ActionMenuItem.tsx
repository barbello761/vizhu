import { type ButtonHTMLAttributes, type ReactNode } from 'react';

import './ActionMenu.scss';

interface ActionMenuItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ReactNode;
  children: ReactNode;
  /** Разрушающее действие — красная подпись и иконка. */
  danger?: boolean;
}

export const ActionMenuItem = ({
  icon,
  children,
  danger = false,
  className,
  type = 'button',
  ...nativeProps
}: ActionMenuItemProps) => (
  <li className="action-menu__row">
    <button
      {...nativeProps}
      type={type}
      className={['action-menu__item', danger && 'action-menu__item--danger', className]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="action-menu__slot" aria-hidden="true">
        {icon}
      </span>
      <span className="action-menu__label">{children}</span>
    </button>
  </li>
);
