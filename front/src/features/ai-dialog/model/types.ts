export type DialogMode = 'describe' | 'ocr' | 'currency';

/** Подпись режима съёмки — заголовок экрана камеры и объявления скринридеру. */
export const DIALOG_MODE_LABELS: Record<DialogMode, string> = {
  describe: 'Описание сцены',
  ocr: 'Распознавание текста',
  currency: 'Определение купюры',
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
  /** Время отправки в ISO — под сообщением показывается «часы:минуты». */
  at: string;
};
