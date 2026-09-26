import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { announceRouteChange } from '@/shared/lib/a11y';

import { EditableFieldForm } from './EditableFieldForm';
import { PencilIcon } from '../../icons';

import './EditableField.scss';

export interface EditableFieldProps {
  label: string;
  /** Значение для показа — уже отформатированное (например, телефон с маской). */
  value: string;
  /** Что подставить в поле при старте правки. По умолчанию совпадает с `value`. */
  editValue?: string;
  /** Иконка слева — и в показе, и в правке. */
  icon?: ReactNode;
  type?: 'text' | 'tel' | 'email';
  inputMode?: 'text' | 'tel' | 'email';
  autoComplete?: string;
  /** Проверка ввода: текст ошибки или `null`, если всё в порядке. */
  validate?: (next: string) => string | null;
  /**
   * Правка на месте: карандаш превращает строку в поле ввода.
   * Взаимоисключимо с `onEdit`; если заданы оба, выигрывает `onEdit`.
   */
  onSave?: (next: string) => Promise<void> | void;
  /**
   * Правка на отдельном экране: карандаш просто зовёт обработчик (обычно
   * переход на роут), строка остаётся строкой. Так свёрстаны «Настройки
   * профиля» — смена имени и почты живёт на своих экранах.
   */
  onEdit?: () => void;
  /**
   * Флоу правки ещё не построен. Карандаш остаётся видимым и фокусируемым
   * (`aria-disabled`, а не `disabled`) и по нажатию объясняет, почему не
   * сработал, — «мёртвая» кнопка молча съедала бы нажатие.
   */
  editDisabled?: boolean;
  /** Что сказать скринридеру при нажатии на неактивный карандаш. */
  editDisabledHint?: string;
  /** Доступное имя карандаша. По умолчанию «Изменить: {label}». */
  editLabel?: string;
  /** Текст на месте пустого значения. */
  emptyText?: string;
  className?: string;
}

const DEFAULT_DISABLED_HINT = 'Функция в разработке';

/**
 * Строка «подпись + значение + карандаш» из макета.
 *
 * Карандаш либо раскрывает поле прямо на месте (`onSave`), либо передаёт
 * управление наружу (`onEdit`) — тогда правка живёт на отдельном экране.
 * После выхода из правки на месте фокус возвращается на карандаш.
 */
export const EditableField = ({
  label,
  value,
  editValue,
  icon,
  type = 'text',
  inputMode,
  autoComplete,
  validate,
  onSave,
  onEdit,
  editDisabled = false,
  editDisabledHint = DEFAULT_DISABLED_HINT,
  editLabel,
  emptyText = 'Не указано',
  className,
}: EditableFieldProps) => {
  const labelId = useId();
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const shouldRestoreFocus = useRef(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing && shouldRestoreFocus.current) {
      editButtonRef.current?.focus();
      shouldRestoreFocus.current = false;
    }
  }, [editing]);

  const handleEditClick = () => {
    if (editDisabled) {
      announceRouteChange(editDisabledHint);
      return;
    }
    if (onEdit) {
      onEdit();
      return;
    }
    shouldRestoreFocus.current = true;
    setEditing(true);
  };

  const handleSubmit = async (next: string) => {
    await onSave?.(next);
    setEditing(false);
  };

  return (
    <div className={['editable-field', className].filter(Boolean).join(' ')}>
      <span className="editable-field__label" id={labelId}>
        {label}
      </span>

      {editing ? (
        <EditableFieldForm
          labelId={labelId}
          icon={icon}
          initialValue={editValue ?? value}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          validate={validate}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="editable-field__row">
          {icon && (
            <span className="editable-field__icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <span className="editable-field__value" data-empty={value ? undefined : ''}>
            {value || emptyText}
          </span>
          <button
            ref={editButtonRef}
            type="button"
            className="editable-field__edit"
            aria-label={editLabel ?? `Изменить: ${label}`}
            aria-disabled={editDisabled || undefined}
            onClick={handleEditClick}
          >
            <PencilIcon />
          </button>
        </div>
      )}
    </div>
  );
};
