import { useEffect } from 'react';
import { Outlet, useMatches } from 'react-router';

import { announceRouteChange } from '@/shared/lib/a11y';
import { CallsOrchestrator } from '@/widgets/CallsOrchestrator';
import './root-layout.scss';

/**
 * Корневая обёртка всего приложения. Не содержит UI — только инфраструктура доступности.
 *
 * Что здесь живёт:
 * - skip-link: первый элемент в DOM, позволяет скринридеру и клавиатуре перепрыгнуть навигацию
 * - sr-announcer: невидимый aria-live регион, скринридер следит за ним (см. announcer.ts)
 * - useEffect: при каждой смене роута сдвигает фокус на <main> и объявляет название страницы
 *
 * Вложенность в роутере:
 *   RootLayout → PageLayout (или другой лейаут) → страница
 * Для фуллскрин страниц (камера и т.п.) можно подключать прямо под RootLayout без PageLayout —
 * тогда нужно самостоятельно добавить <main id="main-content" tabIndex={-1}> на странице.
 */
const APP_NAME = 'ВИЖУ';

/** Название страницы для вкладки и скринридера — из `handle.title` роута. */
const useRouteTitle = () => {
  const matches = useMatches();

  // Берём заголовок самого глубокого совпавшего роута: вложенный уточняет родителя.
  return matches.reduce<string | undefined>(
    (title, match) => (match.handle as { title?: string } | undefined)?.title ?? title,
    undefined,
  );
};

export const RootLayout = () => {
  const routeTitle = useRouteTitle();

  useEffect(() => {
    // document.title раньше не выставлялся нигде и навсегда оставался «ВИЖУ»
    // из index.html — скринридер на каждом переходе слышал одно и то же.
    document.title = routeTitle ? `${routeTitle} — ${APP_NAME}` : APP_NAME;
    document.getElementById('main-content')?.focus();
    announceRouteChange(document.title);
  }, [routeTitle]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        Перейти к основному содержимому
      </a>

      <Outlet />

      <CallsOrchestrator />

      <div
        id="sr-announcer"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="visually-hidden"
      />
    </>
  );
};
