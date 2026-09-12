/**
 * Кольцо фокуса — только для клавиатуры.
 *
 * `:focus-visible` задуман ровно для этого, но браузер трактует его шире, чем
 * нужно: у текстовых полей кольцо загорается и по обычному тапу, а любой
 * программный `.focus()` (возврат фокуса после правки, закрытие меню) браузер
 * тоже считает «видимым» фокусом. На тач-устройстве это выглядело как синяя
 * обводка, которая появляется просто от нажатия.
 *
 * Поэтому держим отдельный признак способа ввода на `<html>`:
 *   `data-pointer` есть  → работают пальцем/мышью, кольцо не рисуем;
 *   `data-pointer` нет   → работают с клавиатуры, кольцо обязательно.
 *
 * Гасится кольцо одним правилом в index.css — компоненты свои `:focus-visible`
 * не меняют, и при навигации с клавиатуры всё остаётся на месте.
 *
 * Обычный набор текста режим НЕ переключает: иначе тапнул по полю, начал
 * печатать — и обводка всё равно появилась. Считаем клавиатурным вводом только
 * навигационные клавиши.
 */

const POINTER_ATTR = 'data-pointer';

/** Клавиши, которыми ходят по интерфейсу, а не набирают текст. */
const NAVIGATION_KEYS = new Set([
  'Tab',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Escape',
]);

export const initFocusModality = (): void => {
  const root = document.documentElement;

  const usePointer = () => root.setAttribute(POINTER_ATTR, '');
  const useKeyboard = (event: KeyboardEvent) => {
    if (NAVIGATION_KEYS.has(event.key)) {
      root.removeAttribute(POINTER_ATTR);
    }
  };

  // capture: признак должен быть выставлен до того, как фокус уедет на
  // элемент и браузер решит, показывать ли кольцо.
  document.addEventListener('pointerdown', usePointer, { capture: true });
  document.addEventListener('keydown', useKeyboard, { capture: true });
};
