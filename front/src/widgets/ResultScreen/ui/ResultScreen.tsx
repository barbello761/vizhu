import { type ReactNode, useEffect, useId } from 'react';

import { announceRouteChange } from '@/shared/lib/a11y';
import { Button } from '@/shared/ui/v2';

import './result-screen.scss';

interface ResultScreenProps {
  /** Заголовок. Переносы строк из макета передаются как `\n`. */
  title: string;
  /** Что случилось и что делать дальше. */
  description: ReactNode;
  /** Подпись единственной кнопки, по умолчанию «Готово». */
  actionLabel?: string;
  onDone: () => void;
  /** Разъяснение для скринридера при открытии экрана. */
  announce?: string;
}

/**
 * Рендерит свой `<main id="main-content">` — подключается роутом напрямую под
 * `RootLayout`, без `PageLayout`.
 */
export const ResultScreen = ({
  title,
  description,
  actionLabel = 'Готово',
  onDone,
  announce,
}: ResultScreenProps) => {
  const titleId = useId();

  useEffect(() => {
    if (announce) {
      announceRouteChange(announce);
    }
  }, [announce]);

  return (
    <main id="main-content" className="result-screen" tabIndex={-1} aria-labelledby={titleId}>
      <div className="result-screen__body">
        <h1 id={titleId} className="result-screen__title">
          {title}
        </h1>
        <p className="result-screen__text">{description}</p>
      </div>

      <div className="result-screen__actions">
        <Button onClick={onDone}>{actionLabel}</Button>
      </div>
    </main>
  );
};
