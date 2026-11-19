import { lazy, Suspense, type ReactNode } from 'react';

import { A11yProvider } from './a11y-provider';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';

// Тосты показывают отдельные экраны (сейчас — кабинет волонтёра), на старте
// они не нужны: sonner грузится своим чанком уже после первого экрана. toast()
// на экранах импортирует тот же модуль, так что очередь тостов общая.
const Toaster = lazy(() => import('sonner').then(({ Toaster }) => ({ default: Toaster })));

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Корневая композиция провайдеров.
 * Добавляйте новые глобальные провайдеры здесь (auth, theme, i18n и т.д.)
 * — в нужном порядке вложенности.
 */
export const AppProviders = ({ children }: AppProvidersProps) => (
  <A11yProvider>
    <ThemeProvider>
      <QueryProvider>
        {children}
        {/* Контейнер toast-уведомлений — sonner */}
        <Suspense fallback={null}>
          <Toaster richColors position="bottom-right" />
        </Suspense>
      </QueryProvider>
    </ThemeProvider>
  </A11yProvider>
);
