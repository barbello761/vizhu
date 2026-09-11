import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { useCallStore, useLiveKitRoom } from '@/features/calls';
import type { EndReason, MatchInfo } from '@/features/calls';
import type { UserRole } from '@/features/profile';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { BLANK_POSTER } from '@/shared/lib/media';
import {
  Alert,
  AlertCircleIcon,
  CallEndIcon,
  CamButton,
  MicIcon,
  MicOffIcon,
  VideocamIcon,
  VideocamOffIcon,
} from '@/shared/ui/v2';

import './CallRoomPage.scss';

type CallRoomStageProps = {
  match: MatchInfo;
  role: UserRole;
};

const CONNECTION_LABEL: Record<string, string> = {
  connecting: 'Соединяем…',
  connected: 'На связи',
  reconnecting: 'Связь нестабильна, переподключаемся…',
  disconnected: 'Звонок завершён',
  failed: 'Не удалось подключиться',
};

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export const CallRoomStage = ({ match, role }: CallRoomStageProps) => {
  const navigate = useNavigate();
  const endCall = useCallStore((s) => s.endCall);
  const returnToLine = useCallStore((s) => s.returnToLine);
  const finishedRef = useRef(false);
  const [seconds, setSeconds] = useState(0);

  const isBlind = role === 'blind';

  const finish = (reason: EndReason) => {
    if (finishedRef.current) {
      return;
    }
    finishedRef.current = true;
    // Незрячий — полностью выходим. Волонтёр остаётся на линии (снова в пул).
    if (isBlind) {
      endCall();
    } else {
      returnToLine();
    }
    const go = () => void navigate(isBlind ? '/help' : '/volunteer', { replace: true });
    if (reason === 'self') {
      announceRouteChange('Звонок завершён.');
      go();
    } else {
      // Собеседник ушёл — озвучиваем и уводим с задержкой, чтобы TTS успел сказать.
      announceRouteChange(reason === 'peer' ? 'Собеседник завершил звонок.' : 'Звонок завершён.');
      setTimeout(go, 1600);
    }
  };

  const {
    connectionState,
    micEnabled,
    cameraEnabled,
    remoteVideoActive,
    cameraSwitching,
    toggleMic,
    toggleCamera,
    leave,
    setRemoteVideoEl,
    setLocalVideoEl,
  } = useLiveKitRoom({ match, role, onDisconnected: finish });

  const handleEnd = () => {
    finish('self');
    leave();
  };

  // Секундомер разговора — с момента установления связи.
  useEffect(() => {
    if (connectionState !== 'connected') {
      return;
    }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [connectionState]);

  const showLocalVideo = isBlind && cameraEnabled && !cameraSwitching;
  const showRemoteVideo = !isBlind && remoteVideoActive;
  const unstable = connectionState === 'reconnecting';

  const hint = isBlind
    ? cameraEnabled
      ? null
      : 'Камера выключена — волонтёр вас не видит'
    : remoteVideoActive
      ? null
      : 'Ожидаем видео с камеры собеседника…';

  return (
    <main id="main-content" className="call-room" tabIndex={-1} aria-label="Видеозвонок">
      {showLocalVideo && (
        <video
          ref={setLocalVideoEl}
          className="call-room__video"
          autoPlay
          playsInline
          muted
          poster={BLANK_POSTER}
          aria-label="Ваша камера — её видит волонтёр"
        />
      )}
      {showRemoteVideo && (
        <video
          ref={setRemoteVideoEl}
          className="call-room__video"
          autoPlay
          playsInline
          muted
          poster={BLANK_POSTER}
          aria-label="Видео с камеры собеседника"
        />
      )}

      {hint && !unstable && <p className="call-room__hint">{hint}</p>}

      <header className="call-room__top">
        <p className="call-room__timer" aria-label={`Длительность звонка ${formatTime(seconds)}`}>
          {formatTime(seconds)}
        </p>
        {unstable && (
          <Alert icon={<AlertCircleIcon />} tone="danger" className="call-room__alert">
            Нестабильное соединение
          </Alert>
        )}
        <span className="visually-hidden" role="status" aria-live="polite">
          {CONNECTION_LABEL[connectionState] ?? ''}
        </span>
      </header>

      {/* Сетка 1fr auto 1fr: «завершить» строго по центру экрана, слева
          микрофон, справа камера (у волонтёра камеры нет — правая ячейка
          остаётся пустой, но центр не съезжает). */}
      <div className="call-room__controls" role="group" aria-label="Управление звонком">
        <div className="call-room__controls-group">
          <CamButton
            aria-label={micEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
            aria-pressed={micEnabled}
            onClick={toggleMic}
          >
            {micEnabled ? <MicIcon /> : <MicOffIcon />}
          </CamButton>
        </div>

        <CamButton
          size="xl"
          tone="danger"
          aria-label="Завершить звонок"
          onClick={handleEnd}
          className="call-room__end"
        >
          <CallEndIcon />
        </CamButton>

        <div className="call-room__controls-group call-room__controls-group--end">
          {isBlind && (
            <CamButton
              aria-label={cameraEnabled ? 'Выключить камеру' : 'Включить камеру'}
              aria-pressed={cameraEnabled}
              onClick={toggleCamera}
            >
              {cameraEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
            </CamButton>
          )}
        </div>
      </div>
    </main>
  );
};
