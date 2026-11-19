import { useEffect, useRef, useState } from 'react';

import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { useVoiceRecord } from '@/shared/lib/use-voice-record';
import { Button, CloseIcon, Modal } from '@/shared/ui';

import { Waveform } from './waveform';

import './voice-record-overlay.scss';

type Props = {
  onClose: () => void;
  onSend: (blob: Blob, mimeType: string) => Promise<void>;
  isSending: boolean;
};

const ERROR_MESSAGES = {
  permission_denied: 'Нет доступа к микрофону — разрешите в настройках браузера',
  not_found: 'Микрофон не найден',
  unknown: 'Ошибка записи. Попробуйте ещё раз.',
} as const;

export const VoiceRecordOverlay = ({ onClose, onSend, isSending }: Props) => {
  const { status, audioBlob, analyserNode, error, start, /*stop*/ cancel } = useVoiceRecord();
  const shouldAutoSendRef = useRef(false);
  const onSendRef = useRef(onSend);
  onSendRef.current = onSend;

  const [isAutoSending, setIsAutoSending] = useState(false);

  // Фокус внутрь окна и обратно на кнопку микрофона после закрытия — забота Modal.
  useEffect(() => {
    void start();
    announceRouteChange('Говорите. Нажмите кнопку когда закончите.');
  }, [start]);

  useEffect(() => {
    if (error) {
      announceRouteChange(ERROR_MESSAGES[error]);
    }
  }, [error]);

  // Auto-send as soon as the blob is ready after manual stop
  useEffect(() => {
    if (status !== 'stopped' || !audioBlob || !shouldAutoSendRef.current) {
      return;
    }
    shouldAutoSendRef.current = false;
    announceRouteChange('Отправка...');
    setIsAutoSending(true);
    void onSendRef.current(audioBlob, audioBlob.type || 'audio/mp4').finally(() => {
      setIsAutoSending(false);
    });
  }, [status, audioBlob]);

  // const _handleStop = () => {
  //   shouldAutoSendRef.current = true;
  //   stop();
  // };

  // const _isActive = status === 'requesting' || status === 'recording';
  const isBusy = isSending || isAutoSending;

  // Кнопка, Escape, тап по фону и системная «назад» ведут сюда. Пока запись
  // уходит, отмена недоступна — но кнопку не глушим disabled (скринридер её бы
  // пропустил), а объясняем, почему она не срабатывает.
  const handleCancel = () => {
    if (isBusy) {
      announceRouteChange('Запись отправляется, подождите');
      return;
    }
    cancel();
    onClose();
  };

  const statusText = error ? ERROR_MESSAGES[error] : isBusy ? 'Отправка...' : 'Говорите...';

  return (
    <Modal className="voice-overlay" aria-label="Запись голоса" onClose={handleCancel}>
      {/* Тап мимо панели — дубль кнопки «Отменить запись» для зрячих, поэтому скрыт. */}
      <div className="voice-overlay__backdrop" onClick={handleCancel} aria-hidden="true" />

      <div className="voice-overlay__panel">
        <p className="voice-overlay__status" aria-live="polite" aria-atomic="true">
          {statusText}
        </p>

        <Waveform analyserNode={analyserNode} />

        <div className="voice-overlay__controls" role="group" aria-label="Управление записью">
          {/* {isActive && (
            // <Button
            //   className="voice-overlay__btn-mic"
            //   aria-label="Остановить запись и отправить"
            //   onClick={handleStop}
            // />
          )} */}

          {/* {isBusy && (
            // <RoundButton
            //   className="voice-overlay__btn-sending"
            //   icon={<Loader2 size={28} className="voice-overlay__spinner" aria-hidden="true" />}
            //   aria-label="Отправка..."
            //   disabled
            // />
          )} */}

          <Button
            variant="secondary"
            startIcon={<CloseIcon />}
            aria-disabled={isBusy || undefined}
            onClick={handleCancel}
          >
            Отменить запись
          </Button>
        </div>
      </div>
    </Modal>
  );
};
