import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import { announceRouteChange } from '@/shared/lib/a11y';
import { platform } from '@/shared/platform';

/**
 * Диагностика съёмки: показывает, каким путём получен кадр (аппаратный
 * ImageCapture или canvas) и сколько он весит. Правило no-console запрещает
 * info — здесь осознанное исключение на один хелпер, чтобы не глушить правило
 * по всему проекту.
 */
// eslint-disable-next-line no-console
const capLog = (...args: unknown[]): void => console.info('[capture]', ...args);

interface UsePhotoCameraOptions {
  /** Превью работает, только пока экран находится в фазе съёмки. */
  isActive: boolean;
  /** Что объявить скринридеру, когда камера готова к снимку. */
  readyMessage: string;
  /** Готовый кадр — снятый камерой или выбранный в галерее. */
  onPhoto: (file: File) => void;
}

/**
 * Камера экрана съёмки: превью, автонастройки объектива, снимок и галерея.
 *
 * Два режима задаёт платформенный слой:
 * - `native-preview` (Capacitor) — превью рисует @capgo/camera-preview позади
 *   WebView, getUserMedia не нужен;
 * - обычный web — поток getUserMedia в теге `<video>`.
 */
export const usePhotoCamera = ({ isActive, readyMessage, onPhoto }: UsePhotoCameraOptions) => {
  const nativeCamera = platform.photoCamera.mode === 'native-preview';

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!isActive || nativeCamera) {
      return;
    }
    let cancelled = false;
    setCameraError(null);

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const track = stream.getVideoTracks()[0];
        if (track) {
          type ExtConstraints = MediaTrackConstraintSet & {
            focusMode?: string;
            whiteBalanceMode?: string;
            exposureMode?: string;
            zoom?: number;
          };
          type ExtCapabilities = MediaTrackCapabilities & {
            focusMode?: string[];
            whiteBalanceMode?: string[];
            exposureMode?: string[];
            zoom?: { min: number; max: number; step: number };
          };
          const caps = track.getCapabilities() as ExtCapabilities;
          const advanced: ExtConstraints[] = [];

          if (caps.focusMode?.includes('continuous')) {
            advanced.push({ focusMode: 'continuous' });
          }
          if (caps.whiteBalanceMode?.includes('continuous')) {
            advanced.push({ whiteBalanceMode: 'continuous' });
          }
          if (caps.exposureMode?.includes('continuous')) {
            advanced.push({ exposureMode: 'continuous' });
          }
          // getUserMedia на Android часто выбирает ультраширокий объектив (0.6x).
          // Зум ~1.3x приближает картинку к основному объективу (1x в нативной камере).
          // if (caps.zoom) {
          //   const targetZoom = Math.min(1.3, caps.zoom.max);
          //   advanced.push({ zoom: targetZoom });
          // }

          if (advanced.length > 0) {
            await track
              .applyConstraints({ advanced: advanced as MediaTrackConstraintSet[] })
              .catch(() => {});
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCameraError('Нет доступа к камере. Проверьте настройки браузера.');
          announceRouteChange('Нет доступа к камере.');
        }
      });

    return () => {
      cancelled = true;
      stopStream();
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [isActive, nativeCamera, stopStream]);

  useEffect(() => {
    if (!isActive || cameraError) {
      return;
    }
    if (nativeCamera) {
      // готовность озвучивает эффект нативного превью ниже
      return;
    }
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const scheduleCountdown = () => {
      if ((video.readyState ?? 0) >= 2) {
        announceRouteChange(readyMessage);
        // auto-capture disabled — пользователь снимает вручную
        // setCountdown(3);
      } else {
        countdownTimerRef.current = setTimeout(scheduleCountdown, 200);
      }
    };
    countdownTimerRef.current = setTimeout(scheduleCountdown, 600);

    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [isActive, cameraError, readyMessage, nativeCamera]);

  useEffect(() => {
    if (!isActive || !nativeCamera) {
      return;
    }
    let cancelled = false;
    setCameraError(null);

    platform.photoCamera
      .startPreview()
      .then(() => {
        if (!cancelled) {
          announceRouteChange(readyMessage);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCameraError('Нет доступа к камере. Проверьте настройки приложения.');
          announceRouteChange('Нет доступа к камере.');
        }
      });

    return () => {
      cancelled = true;
      void platform.photoCamera.stopPreview();
    };
  }, [isActive, nativeCamera, readyMessage]);

  const captureFromStream = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    const video = videoRef.current;
    if (!track || !video || video.videoWidth === 0) {
      return;
    }

    type ExtConstraints = MediaTrackConstraintSet & { focusMode?: string };
    type ExtCapabilities = MediaTrackCapabilities & { focusMode?: string[] };
    const caps = track.getCapabilities() as ExtCapabilities;
    if (caps.focusMode?.includes('single-shot')) {
      await track
        .applyConstraints({ advanced: [{ focusMode: 'single-shot' } as ExtConstraints] })
        .catch(() => {});
      // Samsung Browser / Chrome на Android — фокус-лок занимает до 600–800ms
      await new Promise<void>((r) => setTimeout(r, 700));
    }

    let blob: Blob | null = null;

    // ImageCapture — аппаратный затвор, нативное разрешение (Chrome / Android)
    if ('ImageCapture' in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ic = new (window as any).ImageCapture(track);
        blob = (await ic.takePhoto()) as Blob;
        capLog('ImageCapture.takePhoto()', `${(blob.size / 1024).toFixed(0)} KB`, blob.type);
      } catch (e) {
        console.warn('[capture] ImageCapture failed, fallback to canvas', e);
      }
    }

    if (!blob) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }
      ctx.drawImage(video, 0, 0);
      blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.92));
      if (blob) {
        capLog('canvas fallback', `${(blob.size / 1024).toFixed(0)} KB`, blob.type);
      }
    }

    track.stop();
    stopStream();

    if (!blob) {
      return;
    }
    onPhoto(new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' }));
  }, [onPhoto, stopStream]);

  const captureFromNative = useCallback(async () => {
    try {
      const photo = await platform.photoCamera.capture();
      if (!photo) {
        return;
      }
      onPhoto(photo.file);
    } catch {
      announceRouteChange('Не удалось сделать снимок. Попробуйте ещё раз.');
    }
  }, [onPhoto]);

  const capture = useCallback(() => {
    void (nativeCamera ? captureFromNative() : captureFromStream());
  }, [nativeCamera, captureFromNative, captureFromStream]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((c) => {
        if (c === null || c <= 1) {
          capture();
          return null;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickFromNativeGallery = useCallback(async () => {
    const photo = await platform.photoCamera.pickFromGallery().catch(() => null);
    if (!photo) {
      return;
    }
    onPhoto(photo.file);
  }, [onPhoto]);

  const openGallery = useCallback(() => {
    if (nativeCamera) {
      void pickFromNativeGallery();
      return;
    }
    fileInputRef.current?.click();
  }, [nativeCamera, pickFromNativeGallery]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      stopStream();
      onPhoto(file);
      event.target.value = '';
    },
    [onPhoto, stopStream],
  );

  return {
    nativeCamera,
    videoRef,
    fileInputRef,
    cameraError,
    countdown,
    capture,
    openGallery,
    handleFileChange,
    stopStream,
  };
};
