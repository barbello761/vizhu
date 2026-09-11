/**
 * Прозрачный PNG 1×1 для атрибута `poster` у `<video>`.
 *
 * Нужен на Android: пока в тег не пошли кадры, WebView рисует на его месте
 * свою заглушку — крупную кнопку «плей» в кружке. Заданный (пусть и пустой)
 * poster её подменяет, и до первого кадра видно просто пустоту.
 */
export const BLANK_POSTER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
