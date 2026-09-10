import { type ComponentType } from 'react';
import { NavLink } from 'react-router';
import type { NavLinkRenderProps } from 'react-router';

import { useIsVolunteer } from '@/features/profile';
import { CameraIcon, ChatbubblesIcon, HelpIcon, PersonCircleIcon } from '@/shared/ui/v2';

interface NavItem {
  to: string;
  label: string;
  Icon: ComponentType;
  /** Корневой роут совпадает с префиксом любого другого — ему нужно точное сравнение. */
  end?: boolean;
}

const getNavItemClass = ({ isActive }: NavLinkRenderProps) =>
  ['page-layout__nav-item', isActive && 'page-layout__nav-item--active'].filter(Boolean).join(' ');

export const Navigation = () => {
  const isVolunteer = useIsVolunteer();

  // Третий пункт зависит от роли: у незрячего — «Помощь», у волонтёра — «Кабинет».
  // Иконка одна и та же, отдельного пункта кабинета нет.
  const items: NavItem[] = [
    { to: '/', label: 'ИИ-камера', Icon: CameraIcon, end: true },
    { to: '/history', label: 'История', Icon: ChatbubblesIcon },
    isVolunteer
      ? { to: '/volunteer', label: 'Кабинет', Icon: HelpIcon }
      : { to: '/help', label: 'Помощь', Icon: HelpIcon },
    { to: '/profile', label: 'Профиль', Icon: PersonCircleIcon },
  ];

  return (
    <nav className="page-layout__nav" aria-label="Основная навигация">
      {items.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={getNavItemClass}>
          <Icon />
          <span className="page-layout__nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};
