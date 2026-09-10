import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { announceRouteChange } from '@/shared/lib/a11y';

import { CheckmarkIcon, CloseIcon } from '../../icons';

const SAVE_ERROR = 'Не удалось сохранить. Попробуйте ещё раз.';

interface EditableFieldFormProps {
  /** id видимой подписи — на неё ссылается поле ввода. */
  labelId: string;
  icon?: ReactNode;
  initialValue: string;
  type: 'text' | 'tel' | 'email';
  inputMode?: 'text' | 'tel' | 'email';
  autoComplete?: string;
  validate?: (next: string) => string | null;
  /** Успех закрывает форму (размонтирует её). Бросок — показываем ошибку. */
  onSubmit: (next: string) => Promise<void> | void;
  onCancel: () => void;
}

/**
 * Отдельный компонент, чтобы автофокус срабатывал ровно при входе в правку,
 * а Escape отменял её, не долетая до внешних обработчиков.
 */
export const EditableFieldForm = ({
  labelId,
  icon,
  initialValue,
  type,
  inputMode,
  autoComplete,
  validate,
  onSubmit,
  onCancel,
}: EditableFieldFormProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [draft, setDraft] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = draft.trim();

    const validationError = validate?.(next) ?? null;
    if (validationError) {
      setError(validationError);
      announceRouteChange(validationError);
      inputRef.current?.focus();
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSubmit(next);
    } catch {
      setError(SAVE_ERROR);
      announceRouteChange(SAVE_ERROR);
      setSaving(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    }
  };

  return (
    <form className="editable-field__form" onSubmit={handleSubmit} noValidate>
      <div className="editable-field__control">
        {icon && (
          <span className="editable-field__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          ref={inputRef}
          className="editable-field__input"
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          aria-labelledby={labelId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          value={draft}
          disabled={saving}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="submit"
          className="editable-field__action"
          aria-label="Сохранить"
          disabled={saving}
        >
          <CheckmarkIcon />
        </button>
        <button
          type="button"
          className="editable-field__action"
          aria-label="Отменить"
          disabled={saving}
          onClick={onCancel}
        >
          <CloseIcon />
        </button>
      </div>

      {error && (
        <p className="editable-field__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </form>
  );
};
