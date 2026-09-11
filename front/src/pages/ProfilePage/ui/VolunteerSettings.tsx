import { useEffect } from 'react';

import { announceRouteChange } from '@/shared/lib/a11y';
import { useTheme } from '@/shared/lib/theme';
import {
  MenuItem,
  PersonCircleIcon,
  SegmentedControl,
  type SegmentedControlOption,
  VizhuMarkIcon,
} from '@/shared/ui/v2';

import './ProfilePage.scss';

type ThemeChoice = 'light' | 'dark';

const THEME_OPTIONS: readonly SegmentedControlOption<ThemeChoice>[] = [
  { value: 'light', label: 'Светлая тема' },
  { value: 'dark', label: 'Тёмная тема' },
];

/**
 * Настройки волонтёра (макет Figma 2902:21363): то же меню, что у незрячего, но
 * без разделов доступа — только «Профиль», «О приложении» и выбор темы.
 */
export const VolunteerSettings = () => {
  const { resolvedTheme, setMode } = useTheme();

  useEffect(() => {
    announceRouteChange('Настройки. Профиль, о приложении и выбор темы.');
  }, []);

  const handleThemeChange = (choice: ThemeChoice) => {
    setMode(choice);
    announceRouteChange(choice === 'dark' ? 'Тёмная тема включена' : 'Светлая тема включена');
  };

  return (
    <div className="profile-menu">
      <h1 className="profile-menu__title">Настройки</h1>

      <nav className="profile-menu__nav" aria-label="Разделы настроек">
        <ul className="profile-menu__list">
          <li>
            <MenuItem icon={<PersonCircleIcon />} label="Профиль" to="/profile/settings" />
          </li>
          <li>
            <MenuItem icon={<VizhuMarkIcon />} label="О приложении" to="/about" />
          </li>
        </ul>
      </nav>

      <SegmentedControl
        aria-label="Тема оформления"
        options={THEME_OPTIONS}
        value={resolvedTheme}
        onChange={handleThemeChange}
        className="profile-menu__theme"
      />
    </div>
  );
};
