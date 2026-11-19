import { Component, type ErrorInfo, type ReactNode } from 'react';

import { toAppError, type AppError } from '@/shared/lib/app-error';

import { FatalErrorScreen } from './fatal-error-screen';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: AppError | null;
}

/**
 * Последний рубеж: ловит падения рендера вне роутера (провайдеры, оверлеи) и
 * всё, что пропустили границы роутов. Без него React размонтировал бы корень,
 * и человек остался бы перед пустым экраном без единого слова для скринридера.
 *
 * Классом — у функциональных компонентов границ ошибок нет.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { error: toAppError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('[app] Необработанная ошибка рендера', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    return error ? <FatalErrorScreen error={error} /> : this.props.children;
  }
}
