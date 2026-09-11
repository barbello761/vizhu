import { useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import {
  DIALOG_MODE_LABELS,
  type DialogMode,
  usePhotoAnalysis,
  usePhotoCamera,
  usePhotoDialogStore,
} from '@/features/ai-dialog';
import { BLANK_POSTER } from '@/shared/lib/media';
import {
  AnswerBubble,
  CamButton,
  ChatbubblesIcon,
  ChevronBackIcon,
  ImageIcon,
  MicIcon,
} from '@/shared/ui/v2';

import './CameraPage.scss';

export const CameraPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get('mode') ?? 'describe') as DialogMode;

  const photoUrl = usePhotoDialogStore((state) => state.photoUrl);
  const resultText = usePhotoDialogStore((state) => state.resultText);
  const resultIsError = usePhotoDialogStore((state) => state.resultIsError);
  const isAnalyzing = usePhotoDialogStore((state) => state.isAnalyzing);
  const start = usePhotoDialogStore((state) => state.start);
  const setPhoto = usePhotoDialogStore((state) => state.setPhoto);
  const clearResult = usePhotoDialogStore((state) => state.clearResult);
  const reset = usePhotoDialogStore((state) => state.reset);

  const { analyze } = usePhotoAnalysis(mode);

  // Заход на экран (в том числе со сменой режима) начинает новую сессию —
  // ответ по прошлому снимку не должен всплыть поверх свежего кадра.
  useEffect(() => {
    start(mode);
  }, [mode, start]);

  const handlePhoto = useCallback(
    (file: File) => {
      setPhoto(URL.createObjectURL(file), new Date().toISOString());
      void analyze(file);
    },
    [setPhoto, analyze],
  );

  const hasAnswer = !isAnalyzing && resultText !== null;
  const isCameraPhase = !isAnalyzing && !hasAnswer;

  const camera = usePhotoCamera({
    isActive: isCameraPhase,
    readyMessage: `${DIALOG_MODE_LABELS[mode]}. Камера готова. Нажмите кнопку для снимка.`,
    onPhoto: handlePhoto,
  });

  const handleGoHome = () => {
    camera.stopStream();
    reset();
    void navigate('/', { replace: true });
  };

  const handleOpenChat = () => void navigate('/dialog');

  // Кнопка ИИ-ассистента с экрана камеры: ответ ассистента видно только в
  // диалоге, поэтому переключаемся туда и сразу открываем запись.
  const handleAskAssistant = () => void navigate('/dialog', { state: { openVoice: true } });

  return (
    <main
      id="main-content"
      className="camera-page"
      tabIndex={-1}
      aria-label={DIALOG_MODE_LABELS[mode]}
    >
      {isCameraPhase && !camera.cameraError && !camera.nativeCamera && (
        <video
          ref={camera.videoRef}
          autoPlay
          playsInline
          muted
          poster={BLANK_POSTER}
          className="camera-page__backdrop"
          aria-hidden="true"
        />
      )}

      {!isCameraPhase && photoUrl && (
        <img src={photoUrl} alt="" aria-hidden="true" className="camera-page__backdrop" />
      )}

      {isAnalyzing && <span className="camera-page__glow" aria-hidden="true" />}

      {camera.countdown !== null && (
        <div
          className="camera-page__countdown"
          aria-live="assertive"
          aria-atomic="true"
          aria-label={`Снимок через ${camera.countdown}`}
        >
          {camera.countdown}
        </div>
      )}

      {!camera.nativeCamera && (
        <input
          ref={camera.fileInputRef}
          type="file"
          accept="image/*"
          className="camera-page__file-input"
          onChange={camera.handleFileChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      )}

      <div className="camera-page__body">
        <div className="camera-page__row">
          <CamButton aria-label="На главную" onClick={handleGoHome}>
            <ChevronBackIcon />
          </CamButton>
          <CamButton aria-label="Выбрать фото из галереи" onClick={camera.openGallery}>
            <ImageIcon />
          </CamButton>
        </div>

        {camera.cameraError && (
          <p className="camera-page__error" role="alert">
            {camera.cameraError}
          </p>
        )}

        <div className="camera-page__col">
          {isAnalyzing && (
            <p className="visually-hidden" role="status">
              Анализирую фото
            </p>
          )}

          {hasAnswer && <AnswerBubble text={resultText} isError={resultIsError} />}

          <div className="camera-page__controls" role="group" aria-label="Управление камерой">
            <CamButton aria-label="Спросить голосом" onClick={handleAskAssistant}>
              <MicIcon />
            </CamButton>

            <CamButton
              variant="shutter"
              aria-label={hasAnswer ? 'Снять ещё раз' : 'Сделать снимок'}
              onClick={() => (hasAnswer ? clearResult() : camera.capture())}
              disabled={Boolean(camera.cameraError) || isAnalyzing}
            />

            {hasAnswer && mode === 'describe' ? (
              <CamButton aria-label="Обсудить с нейропомощником" onClick={handleOpenChat}>
                <ChatbubblesIcon />
              </CamButton>
            ) : (
              /* Пустой слот той же ширины — в макете затвор строго по центру. */
              <span className="camera-page__controls-spacer" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>
    </main>
  );
};
