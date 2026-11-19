import { type KeyboardEvent, type ReactNode, type RefObject, useEffect, useRef } from 'react';

import { MODAL_ANNOUNCER_ATTR } from '@/shared/lib/a11y/announcer';
import { platform } from '@/shared/platform';

import './modal.scss';

/** У окна должно быть имя: видимый заголовок (labelledby) или явная подпись. */
type ModalName =
  | { 'aria-labelledby': string; 'aria-label'?: never }
  | { 'aria-label': string; 'aria-labelledby'?: never };

export type ModalProps = ModalName & {
  'aria-describedby'?: string;
  /**
   * Закрытие жестом: Escape, системная «назад» Android, «назад» в браузере.
   * Не передан — окно этими жестами не закрывается (входящий звонок: только
   * явный выбор «Принять» / «Отклонить»), а «назад» не уводит с экрана под ним.
   */
  onClose?: () => void;
  /** Куда поставить фокус при открытии. По умолчанию — первый фокусируемый элемент. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
};

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Открытые окна в порядке открытия: системную «назад» обрабатывает только верхнее. */
const openModals: object[] = [];

const supportsShowModal = (dialog: HTMLDialogElement) => typeof dialog.showModal === 'function';

/**
 * Фолбэк для WebView без showModal (iOS 15.0–15.3): вручную гасим всё вокруг
 * окна — `inert` убирает фокус и клики, `aria-hidden` прячет от VoiceOver
 * там, где `inert` ещё не поддержан. Возвращает функцию отката.
 */
const isolate = (dialog: HTMLElement): (() => void) => {
  const hidden: HTMLElement[] = [];
  for (let node = dialog; node !== document.body && node.parentElement; node = node.parentElement) {
    for (const sibling of Array.from(node.parentElement.children)) {
      if (
        sibling === node ||
        !(sibling instanceof HTMLElement) ||
        sibling.hasAttribute('inert') ||
        sibling.getAttribute('aria-hidden') === 'true'
      ) {
        continue;
      }
      sibling.setAttribute('inert', '');
      sibling.setAttribute('aria-hidden', 'true');
      hidden.push(sibling);
    }
  }
  return () => {
    for (const el of hidden) {
      el.removeAttribute('inert');
      el.removeAttribute('aria-hidden');
    }
  };
};

/**
 * Модальное окно на нативном `<dialog>`.
 *
 * Открыто, пока смонтировано: закрытие — это размонтирование родителем
 * (обычно в `onClose`). `showModal()` даёт то, что ARIA-имитация не даёт:
 * окно в top layer, всё вокруг — inert (TalkBack, в отличие от VoiceOver,
 * `aria-modal` не уважает и уводил бы свайпом на экран под окном), Escape и
 * «назад» браузера приходят событием `cancel`. Сверху — перевод фокуса внутрь,
 * возврат фокуса на место после закрытия, перехват системной «назад» Android и
 * свой live-регион: общий #sr-announcer за пределами окна становится inert и
 * немеет, поэтому `announceRouteChange` пишет сюда.
 */
export const Modal = ({ onClose, initialFocusRef, className, children, ...aria }: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const native = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const token = {};
    const returnFocusTo =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let unmounting = false;

    const focusInitial = () => {
      const target =
        initialFocusRef?.current ?? dialog.querySelector<HTMLElement>(FOCUSABLE) ?? dialog;
      target.focus();
    };
    const requestClose = () => onCloseRef.current?.();

    native.current = supportsShowModal(dialog);
    let restoreBackground: (() => void) | null = null;
    if (native.current) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      dialog.setAttribute('open', '');
      restoreBackground = isolate(dialog);
    }
    focusInitial();
    openModals.push(token);

    // Escape и «назад» браузера. Закрываем сами — размонтированием.
    const handleCancel = (event: Event) => {
      event.preventDefault();
      requestClose();
    };
    // Браузер может закрыть окно вопреки preventDefault (повторная «назад» без
    // жеста пользователя). Окно без onClose возвращаем, иначе оно осталось бы
    // смонтированным, но невидимым.
    const handleClose = () => {
      if (unmounting) {
        return;
      }
      if (onCloseRef.current) {
        requestClose();
      } else if (native.current) {
        dialog.showModal();
        focusInitial();
      }
    };
    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);

    const unsubscribeBack = platform.backButton.subscribe(() => {
      if (openModals[openModals.length - 1] === token) {
        requestClose();
      }
    });

    return () => {
      unmounting = true;
      unsubscribeBack();
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
      openModals.splice(openModals.indexOf(token), 1);
      if (native.current && dialog.open) {
        dialog.close();
      }
      restoreBackground?.();
      if (returnFocusTo?.isConnected) {
        returnFocusTo.focus();
      }
    };
    // Окно открывается один раз на монтирование; initialFocusRef — ref, его
    // .current читается в момент открытия.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // В фолбэке без showModal браузер не превращает Escape в `cancel`.
  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (!native.current && event.key === 'Escape') {
      event.preventDefault();
      onCloseRef.current?.();
    }
  };

  return (
    <dialog
      {...aria}
      ref={dialogRef}
      aria-modal="true"
      tabIndex={-1}
      className={['modal', className].filter(Boolean).join(' ')}
      onKeyDown={handleKeyDown}
    >
      {children}
      <div
        {...{ [MODAL_ANNOUNCER_ATTR]: '' }}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="visually-hidden"
      />
    </dialog>
  );
};
