import { type MouseEventHandler, type ReactNode } from 'react';
import { Link } from 'react-router';

import './IconListItem.scss';

interface IconListItemBase {
  /** Основной текст строки. Длинный — обрезается многоточием. */
  label: string;
  /** Иконка 48×48 в слоте справа. */
  icon: ReactNode;
  className?: string;
}

interface IconListItemLinkProps extends IconListItemBase {
  /** Роут, на который ведёт строка. */
  to: string;
  onClick?: never;
  inactive?: never;
}

interface IconListItemButtonProps extends IconListItemBase {
  /** Действие по нажатию (строка — кнопка). */
  onClick: MouseEventHandler<HTMLButtonElement>;
  to?: never;
  inactive?: never;
}

interface IconListItemInactiveProps extends IconListItemBase {
  /** Строка «в разработке»: остаётся в фокусе и озвучивается, но не действует. */
  inactive: true;
  /** Статус для скринридера, добавляется к `label`. По умолчанию «в разработке». */
  hint?: string;
  /** Вызывается по нажатию на неактивную строку (обычно — объявление статуса). */
  onActivate?: () => void;
  to?: never;
  onClick?: never;
}

export type IconListItemProps =
  | IconListItemLinkProps
  | IconListItemButtonProps
  | IconListItemInactiveProps;

const Body = ({ label, icon, hint }: { label: string; icon: ReactNode; hint?: string }) => (
  <>
    <span className="icon-list-item__label">{label}</span>
    {hint && <span className="visually-hidden">{hint}</span>}
    <span className="icon-list-item__icon" aria-hidden="true">
      {icon}
    </span>
  </>
);

/**
 * Строка-плашка со слотом иконки справа: ссылка (`to`), кнопка-действие
 * (`onClick`) или неактивный пункт «в разработке» (`inactive`).
 */
export const IconListItem = (props: IconListItemProps) => {
  const cls = ['icon-list-item', props.className].filter(Boolean).join(' ');

  if (props.inactive) {
    const { label, icon, hint = 'в разработке', onActivate } = props;
    return (
      <button
        type="button"
        className={`${cls} icon-list-item--inactive`}
        aria-disabled="true"
        onClick={onActivate}
      >
        <Body label={label} icon={icon} hint={hint} />
      </button>
    );
  }

  if (props.to !== undefined) {
    const { label, icon, to } = props;
    return (
      <Link to={to} className={cls}>
        <Body label={label} icon={icon} />
      </Link>
    );
  }

  const { label, icon, onClick } = props;
  return (
    <button type="button" className={cls} onClick={onClick}>
      <Body label={label} icon={icon} />
    </button>
  );
};
