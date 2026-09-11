import { useEffect } from 'react';

import { startRinging, stopRinging, useCallStore } from '@/features/calls';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { Button, MovingGradient } from '@/shared/ui/v2';

import './IncomingCallOverlay.scss';

type IncomingCallOverlayProps = {
  requestId: string;
};

/**
 * Экран входящего звонка для волонтёра. Появляется поверх любой страницы, когда
 * `phase === 'incoming'` (рендерит `CallsOrchestrator`).
 *
 * Макет Figma 2854:35811: полноэкранный синий градиент, заголовок и пояснение
 * сверху, две кнопки снизу — «Принять» (акцентная на белом) и «Отклонить».
 */
export const IncomingCallOverlay = ({ requestId }: IncomingCallOverlayProps) => {
  const accept = useCallStore((s) => s.accept);
  const decline = useCallStore((s) => s.decline);

  useEffect(() => {
    announceRouteChange('Входящий вызов от незрячего. Принять или отклонить.');
    startRinging();
    return () => stopRinging();
  }, []);

  return (
    <div
      className="incoming"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-title"
      aria-describedby="incoming-hint"
    >
      <MovingGradient />

      <div className="incoming__body">
        <div className="incoming__lead">
          <h1 id="incoming-title" className="incoming__title">
            Входящий вызов
          </h1>
          <p id="incoming-hint" className="incoming__hint">
            Разговор идёт голосом — вы увидите видео с камеры незрячего, он вас не увидит.
          </p>
        </div>
      </div>

      <div className="incoming__actions" role="group" aria-label="Действия со звонком">
        <Button onAccent onClick={() => accept(requestId)} aria-label="Принять звонок">
          Принять
        </Button>
        <Button
          variant="tertiary"
          onAccent
          onClick={() => decline(requestId)}
          aria-label="Отклонить звонок"
        >
          Отклонить
        </Button>
      </div>
    </div>
  );
};
