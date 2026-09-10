import { useCallback } from 'react';

import { announceRouteChange } from '@/shared/lib/a11y';

import { useCurrencyMutation, useDescribeMutation, useOcrMutation } from '../api';
import { usePhotoDialogStore } from '../model/photo-dialog.store';
import type { DialogMode } from '../model/types';

const FAILURE_MESSAGE = 'Произошла непредвиденная ошибка. Попробуйте ещё раз.';

export const usePhotoAnalysis = (mode: DialogMode) => {
  const setResult = usePhotoDialogStore((state) => state.setResult);
  const setAnalyzing = usePhotoDialogStore((state) => state.setAnalyzing);

  const describeMutation = useDescribeMutation();
  const ocrMutation = useOcrMutation();
  const currencyMutation = useCurrencyMutation();

  const analyze = useCallback(
    async (file: File) => {
      setAnalyzing(true);
      announceRouteChange('Анализирую фото...');
      try {
        let text: string;
        if (mode === 'ocr') {
          const raw = (await ocrMutation.mutateAsync(file)).text.trim();
          text =
            raw || 'Нейропомощнику не удалось распознать текст на фотографии, попробуйте ещё раз';
        } else if (mode === 'currency') {
          const r = await currencyMutation.mutateAsync(file);
          if (!r.amount.trim()) {
            text = 'Нейропомощнику не удалось распознать номинал купюры, попробуйте ещё раз';
          } else {
            const pct = Math.round(r.confidence * 100);
            text = `${r.amount}. Уверенность: ${pct}%.`;
          }
        } else {
          text = (await describeMutation.mutateAsync(file)).text;
        }
        setResult(text, false);
        announceRouteChange(`Ответ от нейропомощника: ${text}`);
      } catch {
        setResult(FAILURE_MESSAGE, true);
        announceRouteChange(FAILURE_MESSAGE);
      } finally {
        setAnalyzing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode],
  );

  return { analyze };
};
