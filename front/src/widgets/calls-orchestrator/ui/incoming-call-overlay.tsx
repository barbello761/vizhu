import { useEffect, useState } from 'react';

import { startRinging, stopRinging, useCallStore } from '@/features/calls';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { Button, Modal, MovingGradient } from '@/shared/ui';

import './incoming-call-overlay.scss';

type IncomingCallOverlayProps = {
  requestId: string;
};

/**
 * Экран входящего звонка для волонтёра. Появляется поверх любой страницы, когда
 * `phase === 'incoming'` (рендерит `CallsOrchestrator`).
 *
 * Макет Figma 2854:35811: полноэкранный синий градиент, заголовок и пояснение
 * сверху, две кнопки снизу — «Принять» (акцентная на белом) и «Отклонить».
 *
 * Модальное окно без onClose: Escape и системная «назад» его не закрывают —
 * звонок завершает только явный выбор, а экран под ним недоступен ни фокусу,
 * ни свайпу скринридера. Фокус при открытии встаёт на «Принять».
 */
export const IncomingCallOverlay = ({ requestId }: IncomingCallOverlayProps) => {
  const accept = useCallStore((s) => s.accept);
  const decline = useCallStore((s) => s.decline);
  // После «Принять» ждём call:matched: рингтон глушим сразу, а кнопки
  // блокируем — повторное нажатие или «Отклонить» вдогонку только путали сервер.
  const [accepting, setAccepting] = useState(false);

  const handleAccept = () => {
    setAccepting(true);
    stopRinging();
    announceRouteChange('Соединяем со звонком…');
    accept(requestId);
  };

  useEffect(() => {
    announceRouteChange('Входящий вызов от незрячего. Принять или отклонить.');
    startRinging();
    return () => stopRinging();
  }, []);

  return (
    <Modal className="incoming" aria-labelledby="incoming-title" aria-describedby="incoming-hint">
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
        <Button
          onAccent
          loading={accepting}
          onClick={handleAccept}
          aria-label={accepting ? 'Соединяем со звонком' : 'Принять звонок'}
        >
          Принять
        </Button>
        <Button
          variant="tertiary"
          onAccent
          disabled={accepting}
          onClick={() => decline(requestId)}
          aria-label="Отклонить звонок"
        >
          Отклонить
        </Button>
      </div>
    </Modal>
  );
};
