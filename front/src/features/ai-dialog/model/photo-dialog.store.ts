import { createStore } from '@/shared/lib/zustand';

import type { DialogMode } from './types';

interface PhotoDialogState {
  mode: DialogMode;
  /** blob-URL снятого кадра; живёт до следующего снимка или сброса сессии. */
  photoUrl: string | null;
  /** Время снимка в ISO — под фото в диалоге показываются «часы:минуты». */
  photoAt: string | null;
  /** Ответ нейропомощника по фото; он же уходит в диалог как контекст. */
  resultText: string | null;
  resultIsError: boolean;
  /**
   * Запись истории, заведённая бэкендом под этот разбор. Каждый следующий
   * вопрос уходит с ней, и сервер дописывает переписку в ту же запись —
   * поэтому диалог виден в истории, а не теряется при выходе с экрана.
   */
  historyId: string | null;
  /**
   * Идёт разбор снимка. Флаг общий, а не локальный для экрана: снимок можно
   * отправить на разбор из диалога (пункт «Добавить из галереи»), а показать
   * обдумывание должен уже экран камеры.
   */
  isAnalyzing: boolean;
}

interface PhotoDialogActions {
  /** Начать новую сессию: режим задан, результат прошлой попытки очищен. */
  start: (mode: DialogMode) => void;
  setPhoto: (url: string, at: string) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setResult: (text: string, isError: boolean, historyId?: string) => void;
  clearResult: () => void;
  reset: () => void;
}

const INITIAL: PhotoDialogState = {
  mode: 'describe',
  photoUrl: null,
  photoAt: null,
  resultText: null,
  resultIsError: false,
  historyId: null,
  isAnalyzing: false,
};

/**
 * Активная сессия «снимок → ответ → диалог о фото».
 *
 * Экран камеры и экран диалога — разные роуты, поэтому снимок и ответ по нему
 * живут здесь, а не в состоянии одного компонента.
 *
 * blob-URL освобождается ровно в двух местах: при замене снимка новым и при
 * сбросе сессии. Освобождать его при размонтировании экрана нельзя — снимок
 * нужен уже на следующем роуте.
 */
export const usePhotoDialogStore = createStore<PhotoDialogState & PhotoDialogActions>(
  'PhotoDialog',
  (set) => ({
    ...INITIAL,

    start: (mode) =>
      set((draft) => {
        draft.mode = mode;
        draft.resultText = null;
        draft.resultIsError = false;
        draft.historyId = null;
      }),

    setPhoto: (url, at) =>
      set((draft) => {
        if (draft.photoUrl) {
          URL.revokeObjectURL(draft.photoUrl);
        }
        draft.photoUrl = url;
        draft.photoAt = at;
      }),

    setAnalyzing: (isAnalyzing) =>
      set((draft) => {
        draft.isAnalyzing = isAnalyzing;
      }),

    setResult: (text, isError, historyId) =>
      set((draft) => {
        draft.resultText = text;
        draft.resultIsError = isError;
        draft.historyId = historyId ?? null;
      }),

    clearResult: () =>
      set((draft) => {
        draft.resultText = null;
        draft.resultIsError = false;
        draft.historyId = null;
      }),

    reset: () =>
      set((draft) => {
        if (draft.photoUrl) {
          URL.revokeObjectURL(draft.photoUrl);
        }
        Object.assign(draft, INITIAL);
      }),
  }),
);
