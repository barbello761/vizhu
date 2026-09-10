import { type KeyboardEvent, useRef } from 'react';

import './SegmentedControl.scss';

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  /** id панели, которую открывает вкладка — попадает в `aria-controls`. */
  controls?: string;
  /** id самой вкладки, чтобы панель могла сослаться на неё в `aria-labelledby`. */
  id?: string;
}

interface SegmentedControlProps<T extends string> {
  /** У переключателя нет видимого заголовка, поэтому имя задаётся явно. */
  'aria-label': string;
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Переключатель разделов из макета.
 *
 * Реализован как `tablist` с автоматической активацией: стрелки сразу
 * переключают раздел, потому что каждая вкладка показывает уже загруженный
 * список — «выбрал, но не открыл» состояния тут нет и лишний Enter только
 * удлинил бы путь для клавиатуры и скринридера.
 *
 * Табуляцией доступна только выбранная вкладка (roving tabindex) — так группа
 * занимает одну остановку Tab, как того и ждёт пользователь скринридера.
 */
export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  className,
  ...rest
}: SegmentedControlProps<T>) => {
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const focusAt = (index: number) => {
    const next = options[index];
    if (!next) {
      return;
    }
    onChange(next.value);
    tabsRef.current[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = options.length - 1;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        focusAt(index === last ? 0 : index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        focusAt(index === 0 ? last : index - 1);
        break;
      case 'Home':
        focusAt(0);
        break;
      case 'End':
        focusAt(last);
        break;
      default:
        return;
    }

    event.preventDefault();
  };

  return (
    <div
      {...rest}
      role="tablist"
      className={['segmented-control', className].filter(Boolean).join(' ')}
    >
      {options.map((option, index) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            ref={(node) => {
              tabsRef.current[index] = node;
            }}
            type="button"
            role="tab"
            id={option.id}
            aria-selected={selected}
            aria-controls={option.controls}
            tabIndex={selected ? 0 : -1}
            className={[
              'segmented-control__option',
              selected && 'segmented-control__option--selected',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
