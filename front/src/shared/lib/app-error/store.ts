import { createStore } from '@/shared/lib/zustand';

import type { AppError } from './app-error';

/**
 * Как выходить из ошибки по «Попробовать снова»:
 * - `reload` — состояние приложения могло испортиться (исключение в коде),
 *   надёжнее начать с чистого листа;
 * - `refetch` — упал только запрос данных, перезапрашиваем, не теряя экран.
 */
export type AppErrorRecovery = 'reload' | 'refetch';

interface AppErrorState {
  current: { error: AppError; recovery: AppErrorRecovery } | null;
  report: (error: AppError, recovery: AppErrorRecovery) => void;
  dismiss: () => void;
}

/**
 * Ошибка, которую нужно показать поверх приложения. Хранится первая: за
 * исходной поломкой обычно сыплются следствия, а чинить нужно причину —
 * и код у человека в поддержке должен быть её.
 */
export const useAppErrorStore = createStore<AppErrorState>('AppError', (set) => ({
  current: null,
  report: (error, recovery) =>
    set((draft) => {
      draft.current ??= { error, recovery };
    }),
  dismiss: () =>
    set((draft) => {
      draft.current = null;
    }),
}));
