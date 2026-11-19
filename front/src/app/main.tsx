import { StatusBar } from '@capacitor/status-bar';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { bootstrapAuth } from '@/features/auth';
import { useCallStore } from '@/features/calls';
import { env, STORAGE_KEYS } from '@/shared/config';
import { initFocusModality } from '@/shared/lib/a11y';
import { toAppError } from '@/shared/lib/app-error';
import { checkConnection, startConnectivityMonitor } from '@/shared/lib/connectivity';
import { resolveActiveTheme } from '@/shared/lib/theme';
import { initInsetsCache, isNativePlatform, syncStatusBar } from '@/shared/platform';

import {
  AppErrorBoundary,
  ErrorOverlay,
  FatalErrorScreen,
  installGlobalErrorHandlers,
} from './error-handling';
import { initPlatform } from './platform-init';
import { AppProviders } from './providers';
import { createAppRouter, preloadCallRoomOnCallStart } from './router';

import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Элемент #root не найден. Проверьте index.html.');
}
const root = createRoot(rootElement);

// Как можно раньше: падения на старте тоже должны дойти до экрана ошибки,
// а не остаться в консоли.
installGlobalErrorHandlers();
startConnectivityMonitor();

const removePreloader = () => {
  const preloader = document.getElementById('app-preloader');
  if (!preloader || preloader.classList.contains('hidden')) {
    return;
  }
  preloader.classList.add('hidden');
  setTimeout(() => preloader.remove(), 400);
};

type AppRouter = ReturnType<typeof createAppRouter>;

/**
 * Экраны грузятся лениво (route.lazy), и до загрузки чанка первого экрана
 * RouterProvider рисует пустоту. Ждём инициализации под заставкой — иначе
 * между ней и экраном мелькал бы пустой #root, а скринридер терял фокус.
 */
const waitForRouter = (router: AppRouter): Promise<void> =>
  router.state.initialized
    ? Promise.resolve()
    : new Promise((resolve) => {
        const unsubscribe = router.subscribe((state) => {
          if (state.initialized) {
            unsubscribe();
            resolve();
          }
        });
      });

const startApp = async () => {
  // Должно отработать до первого взаимодействия: слушатели решают, рисовать ли
  // кольцо фокуса (см. shared/lib/a11y/focus-modality).
  initFocusModality();
  // Запоминает системные отступы, чтобы следующая загрузка применила их
  // до первой отрисовки (см. shared/platform/insets).
  initInsetsCache();

  // Роутер создаётся ЗДЕСЬ, а не на импорте модуля: createBrowserRouter
  // сразу гоняет гарды, а они должны видеть состояние ПОСЛЕ бутстрапа.
  const router = createAppRouter();
  await waitForRouter(router);
  preloadCallRoomOnCallStart();

  root.render(
    <StrictMode>
      <AppErrorBoundary>
        <AppProviders>
          <RouterProvider router={router} />
          {/* Вне RouterProvider: окно должно пережить и падение роутера. */}
          <ErrorOverlay />
        </AppProviders>
      </AppErrorBoundary>
    </StrictMode>,
  );
  // Старт удался — следующий пропавший чанк снова может перезагрузить вкладку.
  try {
    sessionStorage.removeItem(STORAGE_KEYS.CHUNK_RELOAD);
  } catch {
    // sessionStorage недоступен (приватный режим) — флага и не было.
  }
  // Снимаем заставку не сразу после render(): initial-render в React 18
  // коммитится асинхронно, и синхронное снятие показывало пустой #root за
  // тающей заставкой (чёрно-белые вспышки в PWA/web). Double-rAF = после
  // первого кадра с уже отрисованным приложением; setTimeout — страховка на
  // случай, если вкладка свёрнута и rAF не срабатывает.
  requestAnimationFrame(() => requestAnimationFrame(removePreloader));
  setTimeout(removePreloader, 3000);
};

// Вкладка, открытая до деплоя, просит чанки экранов, которых на сервере уже
// нет (хэши в именах сменились). Перезагружаем страницу за свежим index.html —
// один раз, чтобы при настоящем обрыве сети не уйти в цикл перезагрузок.
// В Capacitor чанки лежат внутри приложения, событие там не срабатывает.
// Во время звонка не перезагружаем никогда: это рвёт сокет матчинга и сам
// звонок (в том числе из-за фоновой подгрузки экрана звонка), а упавший
// переход покажет экран ошибки роутера.
window.addEventListener('vite:preloadError', (event) => {
  if (useCallStore.getState().phase !== 'idle') {
    return;
  }
  try {
    if (sessionStorage.getItem(STORAGE_KEYS.CHUNK_RELOAD)) {
      return;
    }
    sessionStorage.setItem(STORAGE_KEYS.CHUNK_RELOAD, '1');
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

// PWA-сервис-воркер регистрируем только в браузере: внутри Capacitor ассеты
// и так локальные, а кэш Workbox лишь добавил бы несвежих данных.
if (import.meta.env.PROD && !isNativePlatform() && 'serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

// Порядок важен: сначала нативные реализации портов + rehydrate персистов
// (на Capacitor), потом восстановление access-токена тихим /auth/refresh —
// иначе гарды роутера и первые запросы уйдут без авторизации.
/**
 * Сколько ждём тихий /auth/refresh, прежде чем показать интерфейс.
 * Всё это время пользователь смотрит на заставку, поэтому ждать до полного
 * таймаута axios (30с) нельзя. Не успели — стартуем как есть: флаг isAuthed
 * поднят из персиста, а токен дотянет интерсептор на первом же 401.
 */
const AUTH_BOOTSTRAP_TIMEOUT_MS = 4000;

const withTimeout = (task: Promise<unknown>, ms: number): Promise<unknown> =>
  Promise.race([task, new Promise((resolve) => setTimeout(resolve, ms))]);

const bootstrap = async () => {
  // Пульс сервера — параллельно с платформой, чтобы не удлинять заставку.
  // Если сервер не ответил, экран «нет соединения» будет уже на первом кадре,
  // а не после того, как экраны отрисуются пустыми.
  await Promise.all([
    // Ошибки не глотаем молча: если нативные реализации не поднялись,
    // приложение тихо деградирует до web-портов (secureStorage в памяти →
    // слетает сессия), и без этого лога причину не найти.
    initPlatform().catch((error: unknown) => {
      console.error('[platform] Не удалось инициализировать нативные порты', error);
    }),
    checkConnection(),
  ]);
  await withTimeout(
    bootstrapAuth().catch((error: unknown) => {
      console.error('[auth] bootstrap упал', error);
    }),
    AUTH_BOOTSTRAP_TIMEOUT_MS,
  );

  if (isNativePlatform()) {
    await StatusBar.setOverlaysWebView({ overlay: false });
    // Явно красим статус-бар под тему: без этого на части Android-прошивок
    // (MIUI/HyperOS) полоса остаётся прозрачной и «съедает» верх экрана.
    await syncStatusBar(resolveActiveTheme());
  }
  await startApp();
};

/**
 * Запуск упал целиком (роутер не создался, нативный плагин бросил) — без этого
 * человек навсегда остался бы перед заставкой. Рисуем экран ошибки без
 * провайдеров: на них и могло упасть.
 */
const runBootstrap = () =>
  bootstrap().catch((error: unknown) => {
    console.error('[app] Запуск не удался', error);
    root.render(<FatalErrorScreen error={toAppError(error)} />);
    removePreloader();
  });

// Моки включаются явным флагом, а не самим фактом dev-сборки
if (import.meta.env.DEV && env.enableMocks) {
  // MSW должен стартовать до bootstrapAuth — refresh-запрос идёт через моки.
  await import('@/shared/api/mocks/browser').then(({ worker }) => {
    void worker
      .start({ onUnhandledRequest: 'bypass' })
      .then(runBootstrap)
      .catch(() => void runBootstrap());
  });
} else {
  void runBootstrap();
}
