import { type RefObject, useEffect } from 'react';

/**
 * Как именно закрыли блок. Разделение нужно вызывающему коду: после Escape
 * фокус возвращают на кнопку-открывашку, а после нажатия вне — нет, иначе
 * фокус отберут у того, куда пользователь только что ткнул.
 */
export type DismissReason = 'escape' | 'outside';

interface UseDismissOptions {
  isOpen: boolean;
  /** Контейнер всплывающего блока вместе с кнопкой, которая его открыла. */
  containerRef: RefObject<HTMLElement | null>;
  onDismiss: (reason: DismissReason) => void;
}

/**
 * Закрывает всплывающий блок по Escape и по нажатию вне его границ.
 *
 * Escape слушаем на `keydown` в фазе всплытия, а указатель — на `pointerdown`:
 * до `click` браузер успевает перевести фокус, и меню закрылось бы раньше,
 * чем нажатие дошло до своего пункта.
 */
export const useDismiss = ({ isOpen, containerRef, onDismiss }: UseDismissOptions) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onDismiss('escape');
        }
      },
      { signal },
    );

    document.addEventListener(
      'pointerdown',
      (event) => {
        if (!containerRef.current?.contains(event.target as Node)) {
          onDismiss('outside');
        }
      },
      { signal },
    );

    return () => controller.abort();
  }, [isOpen, containerRef, onDismiss]);
};
