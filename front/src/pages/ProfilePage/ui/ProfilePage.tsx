import { useEffect } from 'react';

import { announceRouteChange } from '@/shared/lib/a11y';
import { useTheme } from '@/shared/lib/theme';
import {
  DocumentTextIcon,
  FlashIcon,
  MenuItem,
  PersonCircleIcon,
  SegmentedControl,
  type SegmentedControlOption,
  TextTile,
  VizhuMarkIcon,
} from '@/shared/ui/v2';

import './ProfilePage.scss';

type ThemeChoice = 'light' | 'dark';

const THEME_OPTIONS: readonly SegmentedControlOption<ThemeChoice>[] = [
  { value: 'light', label: 'Светлая тема' },
  { value: 'dark', label: 'Тёмная тема' },
];

const IN_DEVELOPMENT = 'Раздел в разработке — скоро появится';

export const ProfilePage = () => {
  const { resolvedTheme, setMode } = useTheme();

  useEffect(() => {
    announceRouteChange('Профиль. Меню разделов, информация о доступе и выбор темы.');
  }, []);

  const handleThemeChange = (choice: ThemeChoice) => {
    setMode(choice);
    announceRouteChange(choice === 'dark' ? 'Тёмная тема включена' : 'Светлая тема включена');
  };

  return (
    <div className="profile-menu">
      <h1 className="visually-hidden">Профиль</h1>

      <TextTile title="Бесплатный доступ">
        <p>Есть суточные ограничения</p>
        <p>Подтвердите статус ИПРА или оформите подписку для безлимитного доступа</p>
      </TextTile>

      <nav className="profile-menu__nav" aria-label="Разделы профиля">
        <ul className="profile-menu__list">
          <li>
            <MenuItem icon={<PersonCircleIcon />} label="Профиль" to="/profile/settings" />
          </li>
          <li>
            <MenuItem
              icon={<FlashIcon />}
              label="Премиум-доступ"
              inactive
              onActivate={() => announceRouteChange(IN_DEVELOPMENT)}
            />
          </li>
          <li>
            <MenuItem icon={<VizhuMarkIcon />} label="О приложении" to="/about" />
          </li>
          <li>
            <MenuItem
              icon={<DocumentTextIcon />}
              label="Подтвердить ИПРА"
              inactive
              onActivate={() => announceRouteChange(IN_DEVELOPMENT)}
            />
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
