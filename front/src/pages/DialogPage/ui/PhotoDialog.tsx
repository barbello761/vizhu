import { useCallback, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';

import {
  type ChatMessage,
  usePhotoAnalysis,
  usePhotoCamera,
  usePhotoDialogStore,
} from '@/features/ai-dialog';
import { ActionMenuItem, CameraIcon, ImageIcon } from '@/shared/ui/v2';

import { DialogChat } from './DialogChat';

import './DialogPage.scss';

/** Диалог о только что снятом фото — продолжение экрана камеры. */
export const PhotoDialog = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const autoOpenVoice = Boolean((location.state as { openVoice?: boolean } | null)?.openVoice);

  const mode = usePhotoDialogStore((state) => state.mode);
  const photoUrl = usePhotoDialogStore((state) => state.photoUrl);
  const photoAt = usePhotoDialogStore((state) => state.photoAt);
  const resultText = usePhotoDialogStore((state) => state.resultText);
  const historyId = usePhotoDialogStore((state) => state.historyId);
  const setPhoto = usePhotoDialogStore((state) => state.setPhoto);
  const clearResult = usePhotoDialogStore((state) => state.clearResult);
  const reset = usePhotoDialogStore((state) => state.reset);

  const { analyze } = usePhotoAnalysis(mode);

  // Переписка открывается ответом по фото и дальше живёт своей жизнью,
  // поэтому стартовый набор считается один раз, при входе на экран.
  const [initialMessages] = useState<ChatMessage[]>(() =>
    resultText ? [{ role: 'assistant', text: resultText, at: new Date().toISOString() }] : [],
  );

  const cameraPath = `/camera?mode=${mode}`;

  const handlePhoto = useCallback(
    (file: File) => {
      setPhoto(URL.createObjectURL(file), new Date().toISOString());
      void analyze(file);
      // Разбор снимка показывает экран камеры — там и подсветка, и плашка ответа.
      void navigate(cameraPath);
    },
    [setPhoto, analyze, navigate, cameraPath],
  );

  // Превью не нужно — из диалога камера используется только как выбор файла.
  const camera = usePhotoCamera({ isActive: false, readyMessage: '', onPhoto: handlePhoto });

  const handleRetake = () => {
    clearResult();
    void navigate(cameraPath);
  };

  const handleExit = () => {
    reset();
    void navigate('/', { replace: true });
  };

  // Прямой заход на /dialog без снятого кадра обсуждать нечего — на главную.
  if (!photoUrl) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <DialogChat
        title="Диалог о фото"
        photoUrl={photoUrl}
        photoAt={photoAt}
        initialMessages={initialMessages}
        context={resultText ?? undefined}
        historyId={historyId ?? undefined}
        autoOpenVoice={autoOpenVoice}
        onExit={handleExit}
        attachItems={
          <>
            <ActionMenuItem icon={<CameraIcon />} onClick={handleRetake}>
              Сделать фото
            </ActionMenuItem>
            <ActionMenuItem icon={<ImageIcon />} onClick={camera.openGallery}>
              Добавить из галереи
            </ActionMenuItem>
          </>
        }
      />

      {!camera.nativeCamera && (
        <input
          ref={camera.fileInputRef}
          type="file"
          accept="image/*"
          className="dialog-page__file-input"
          onChange={camera.handleFileChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      )}
    </>
  );
};
