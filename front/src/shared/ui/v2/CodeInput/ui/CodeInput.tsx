import { type ClipboardEvent, type FocusEvent, type KeyboardEvent, useId, useRef } from 'react';

import './CodeInput.scss';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  /**
   * Код набран полностью. Вызывается ровно в момент ввода последней цифры
   * (набором или вставкой), а не из эффекта по значению, — иначе повторный
   * рендер родителя отправлял бы код ещё раз.
   */
  onComplete?: (value: string) => void;
  /** Enter в любой клетке — отправить код вручную, не дожидаясь автоотправки. */
  onSubmit?: () => void;
  label: string;
  length?: number;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export const CodeInput = ({
  value,
  onChange,
  onComplete,
  onSubmit,
  label,
  length = 4,
  error,
  disabled = false,
  autoFocus = false,
  className,
}: CodeInputProps) => {
  const id = useId();
  const errorId = `${id}-error`;
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  // Отличает наш программный перевод фокуса от клика или Tab пользователя:
  // в обработчике focus значение `value` ещё старое, и без этого флага
  // редирект «на первую пустую» отбрасывал фокус назад после каждой цифры.
  const movingFocus = useRef(false);

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const focusAt = (index: number) => {
    movingFocus.current = true;
    refs.current[Math.min(Math.max(index, 0), length - 1)]?.focus();
    movingFocus.current = false;
  };

  const commit = (next: string) => {
    const trimmed = next.slice(0, length);
    onChange(trimmed);
    if (trimmed.length === length) {
      onComplete?.(trimmed);
    }
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (!digit) {
      return;
    }
    commit(value.slice(0, index) + digit + value.slice(index + 1));
    focusAt(index + 1);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Клетки кода — не одно поле формы, неявной отправки по Enter браузер
      // здесь не делает. Отправляем сами: автоотправка по последней цифре
      // может не сработать (код вставили не до конца, была ошибка).
      event.preventDefault();
      onSubmit?.();
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (value[index]) {
        commit(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        commit(value.slice(0, index - 1) + value.slice(index));
        focusAt(index - 1);
      }
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusAt(index - 1);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusAt(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) {
      return;
    }
    commit(pasted);
    focusAt(pasted.length);
  };

  const handleFocus = (index: number, event: FocusEvent<HTMLInputElement>) => {
    // Клик по клетке за первой пустой возвращает к первой пустой: код
    // заполняется слева направо, дырок в значении не бывает.
    if (!movingFocus.current && index > value.length) {
      focusAt(value.length);
      return;
    }
    event.target.select();
  };

  const cls = ['code-input', error && 'code-input--error', className].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <div className="code-input__row" role="group" aria-label={label} onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            // Позиция и есть идентичность поля: клетки не переупорядочиваются.

            key={index}
            ref={(el) => {
              refs.current[index] = el;
            }}
            className="code-input__field"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={`Цифра ${index + 1} из ${length}`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onFocus={(event) => handleFocus(index, event)}
          />
        ))}
      </div>

      {error && (
        <p className="code-input__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
