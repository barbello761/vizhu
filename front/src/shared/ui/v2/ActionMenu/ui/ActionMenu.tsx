import { type ReactNode } from 'react';

import './ActionMenu.scss';

interface ActionMenuProps {
  /** У меню нет видимого заголовка, поэтому имя задаётся явно. */
  'aria-label': string;
  children: ReactNode;
  id?: string;
  className?: string;
}

export const ActionMenu = ({ children, className, ...rest }: ActionMenuProps) => (
  <ul {...rest} role="list" className={['action-menu', className].filter(Boolean).join(' ')}>
    {children}
  </ul>
);
