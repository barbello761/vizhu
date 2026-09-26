import { type ReactNode } from 'react';
import { Link } from 'react-router';

import './MenuItem.scss';

interface MenuItemBase {
  /** Иконка 48×48 в слоте слева. */
  icon: ReactNode;
  label: string;
  className?: string;
}

interface MenuItemLinkProps extends MenuItemBase {
  /** Роут, на который ведёт пункт. */
  to: string;
  inactive?: never;
}

interface MenuItemInactiveProps extends MenuItemBase {
  /** Пункт в разработке: остаётся в фокусе и озвучивается, но не переходит. */
  inactive: true;
  /**
   * Статус для скринридера — добавляется к названию пункта. По умолчанию
   * «в разработке». Визуально пункт просто приглушён, как в макете.
   */
  hint?: string;
  /** Вызывается по нажатию на неактивный пункт (обычно — объявление статуса). */
  onActivate?: () => void;
}

export type MenuItemProps = MenuItemLinkProps | MenuItemInactiveProps;

const Body = ({ icon, label, hint }: { icon: ReactNode; label: string; hint?: string }) => (
  <>
    <span className="menu-item__icon" aria-hidden="true">
      {icon}
    </span>
    <span className="menu-item__label">{label}</span>
    {hint && <span className="visually-hidden">{hint}</span>}
  </>
);

/**
 * Либо ссылка-переход (`to`), либо неактивный пункт «в разработке» (`inactive`).
 */
export const MenuItem = (props: MenuItemProps) => {
  const cls = ['menu-item', props.className].filter(Boolean).join(' ');

  if (props.inactive) {
    const { icon, label, hint = 'в разработке', onActivate } = props;
    return (
      <button
        type="button"
        className={`${cls} menu-item--inactive`}
        aria-disabled="true"
        onClick={onActivate}
      >
        <Body icon={icon} label={label} hint={hint} />
      </button>
    );
  }

  const { icon, label, to } = props;
  return (
    <Link to={to} className={cls}>
      <Body icon={icon} label={label} />
    </Link>
  );
};
