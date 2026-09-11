import { type FormEvent, useId } from 'react';

import { SearchIcon, SendIcon } from '../../icons';

import './SearchField.scss';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /**
   * Подтверждение запроса кнопкой или Enter. Список фильтруется по ходу ввода,
   * поэтому обработчику остаётся сообщить результат — например, озвучить,
   * сколько записей нашлось.
   */
  onSubmit?: (value: string) => void;
  /** Видимой подписи у поля нет, поэтому имя задаётся явно. */
  label: string;
  placeholder?: string;
  submitLabel?: string;
  className?: string;
}

export const SearchField = ({
  value,
  onChange,
  onSubmit,
  label,
  placeholder,
  submitLabel = 'Найти',
  className,
}: SearchFieldProps) => {
  const id = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(value);
  };

  return (
    <form
      role="search"
      aria-label={label}
      className={['search-field', className].filter(Boolean).join(' ')}
      onSubmit={handleSubmit}
    >
      <span className="search-field__slot" aria-hidden="true">
        <SearchIcon />
      </span>

      <input
        id={id}
        type="search"
        className="search-field__control"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />

      <button type="submit" className="search-field__submit" aria-label={submitLabel}>
        <SendIcon />
      </button>
    </form>
  );
};
