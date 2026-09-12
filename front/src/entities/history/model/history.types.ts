export type RequestType = 'describe' | 'currency' | 'ocr' | 'volunteer';

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  describe: 'Описание сцены',
  currency: 'Купюры',
  ocr: 'OCR',
  volunteer: 'Волонтёр',
};

export type HistoryMessage = {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string; // ISO 8601
};

export type HistoryEntry = {
  id: string;
  type: RequestType;
  title: string;
  messages: HistoryMessage[];
  /**
   * Время последней реплики — по нему бэкенд сортирует список, по нему же
   * показываем дату в строке. Записи, заведённые до появления поля, его не
   * имеют — для них используем `createdAt` (см. `historyEntryTime`).
   */
  lastMessageAt: string | null; // ISO 8601
  createdAt: string; // ISO 8601
};

/** Когда в диалоге в последний раз что-то происходило. */
export const historyEntryTime = (entry: HistoryEntry): string =>
  entry.lastMessageAt ?? entry.createdAt;
