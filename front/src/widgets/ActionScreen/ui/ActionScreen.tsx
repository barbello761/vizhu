import { type ReactNode, useEffect, useId } from 'react';

import { announceRouteChange } from '@/shared/lib/a11y';
import { Button, ChevronBackIcon } from '@/shared/ui/v2';

import './action-screen.scss';

interface ActionScreenProps {
  /** Заголовок. Переносы строк из макета передаются как `\n`. */
  title: string;
  /** Пояснение — что произойдёт после подтверждения. */
  description: ReactNode;
  /** Необязательный второй абзац под описанием. */
  note?: ReactNode;
  /** Цвет главной кнопки: акцентная или опасная (по умолчанию акцентная). */
  tone?: 'accent' | 'danger';
  confirmLabel: string;
  /**
   * Действие ещё не реализовано на бэке. Кнопка остаётся в фокусе и озвучивается
   * (`aria-disabled`), но приглушена; за реакцию на клик отвечает `onConfirm`.
   */
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  onConfirm: () => void;
  cancelLabel?: string;
  onCancel: () => void;
  /**
   * Кнопка «назад» в шапке. Рендерится только если передан обработчик —
   * у экранов-подтверждений её обычно нет, выход там через «Отмена».
   */
  onBack?: () => void;
  backLabel?: string;
  /** Разъяснение для скринридера при открытии экрана. */
  announce?: string;
}

/**
 * Рендерит свой `<main id="main-content">` — подключается роутом напрямую под
 * `RootLayout`, без `PageLayout`.
 */
export const ActionScreen = ({
  title,
  description,
  note,
  tone = 'accent',
  confirmLabel,
  confirmDisabled = false,
  confirmLoading = false,
  onConfirm,
  cancelLabel = 'Отмена',
  onCancel,
  onBack,
  backLabel = 'Назад',
  announce,
}: ActionScreenProps) => {
  const titleId = useId();

  useEffect(() => {
    if (announce) {
      announceRouteChange(announce);
    }
  }, [announce]);

  const cls = ['action-screen', onBack && 'action-screen--with-back'].filter(Boolean).join(' ');

  return (
    <main id="main-content" className={cls} tabIndex={-1} aria-labelledby={titleId}>
      {onBack && (
        <div className="action-screen__top">
          <Button variant="icon" aria-label={backLabel} onClick={onBack}>
            <ChevronBackIcon />
          </Button>
        </div>
      )}

      <div className="action-screen__body">
        <h1 id={titleId} className="action-screen__title">
          {title}
        </h1>
        <p className="action-screen__text">{description}</p>
        {note && <p className="action-screen__text">{note}</p>}
      </div>

      <div className="action-screen__actions">
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          aria-disabled={confirmDisabled || undefined}
          loading={confirmLoading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </main>
  );
};
