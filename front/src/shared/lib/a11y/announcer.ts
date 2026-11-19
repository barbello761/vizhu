/** Атрибут live-региона внутри модального окна (см. shared/ui/modal). */
export const MODAL_ANNOUNCER_ATTR = 'data-sr-announcer';

/**
 * Куда писать объявление. Открытое модальное окно делает всё вокруг себя
 * inert, и общий #sr-announcer из RootLayout выпадает из дерева доступности —
 * скринридер его больше не слышит. Поэтому у каждого окна свой live-регион,
 * и пишем в регион верхнего (последнего открытого) окна.
 */
const findAnnouncer = (): HTMLElement | null => {
  const inModals = document.querySelectorAll<HTMLElement>(`[${MODAL_ANNOUNCER_ATTR}]`);
  return inModals.length > 0
    ? inModals[inModals.length - 1]
    : document.getElementById('sr-announcer');
};

/**
 * Произносит сообщение через скринридер при смене роута.
 *
 * В SPA переходы "тихие" — браузер не сигнализирует скринридеру о смене страницы.
 * Функция пишет текст в невидимый div[aria-live="polite"] (id="sr-announcer" в RootLayout,
 * а при открытом модальном окне — его собственный регион) — скринридер следит за ним
 * и вслух произносит всё, что туда попадает.
 *
 * Сброс в '' перед записью обязателен: без него повторный одинаковый текст не озвучится.
 * Задержка 50мс нужна, чтобы сброс и запись не слились в один тик и оба сработали.
 *
 * @param message - текст для произнесения (обычно document.title текущей страницы)
 */
export function announceRouteChange(message: string) {
  const el = findAnnouncer();
  if (!el) {
    return;
  }
  el.textContent = '';
  setTimeout(() => {
    el.textContent = message;
  }, 50);
}
