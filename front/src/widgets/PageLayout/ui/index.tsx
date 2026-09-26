import { Outlet, useMatches } from 'react-router';

import { Navigation } from './Navigation';

import './page-layout.scss';

type RouteHandle =
  | { headerVariant?: 'logo' }
  | { headerVariant: 'back'; title: string }
  | { headerVariant: 'none' };

/**
 * Лейаут для обычных страниц: хедер + контент + нижняя навигация.
 *
 * Вариант хедера и заголовок задаются через handle роута в router.tsx:
 *   { path: 'settings', element: <SettingsPage />, handle: { title: 'Настройки', headerVariant: 'back' } }
 *   { index: true, element: <HomePage />, handle: { headerVariant: 'logo' } }
 *   { path: 'camera', element: <CameraPage />, handle: { headerVariant: 'none' } }
 *
 * 'none' — экран без хедера: остаётся только контент и таб-бар.
 *
 * Новый вариант хедера — добавь компонент рядом (LogoHeader/BackHeader) и новое значение в RouteHandle.
 *
 * <main id="main-content"> обязателен: на него ведёт skip-link из RootLayout,
 * и туда RootLayout сдвигает фокус при смене роута.
 */
export const PageLayout = () => {
  const matches = useMatches();
  const handle = matches.at(-1)?.handle as RouteHandle | undefined;

  const mainCls = [
    'page-layout__main',
    handle?.headerVariant === 'none' && 'page-layout__main--flush',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="page-layout">
      <main id="main-content" className={mainCls} tabIndex={-1}>
        <Outlet />
      </main>

      <Navigation />
    </div>
  );
};
