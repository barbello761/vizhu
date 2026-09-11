import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

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
  /** Сохранение значения. Может бросить — форма покажет ошибку и не закроется. */
  onSave: (next: string) => Promise<void> | void;
  /** Доступное имя карандаша. По умолчанию «Изменить: {label}». */
  editLabel?: string;
  /** Текст на месте пустого значения. */
  emptyText?: string;
  className?: string;
}

/**
 * По карандашу поле превращается в инпут с сохранением/отменой прямо на месте.
 * Фокус возвращается на карандаш после выхода из правки.
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

  const startEditing = () => {
    shouldRestoreFocus.current = true;
    setEditing(true);
  };

  const handleSubmit = async (next: string) => {
    await onSave(next);
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
            onClick={startEditing}
          >
            <PencilIcon />
          </button>
        </div>
      )}
    </div>
  );
};
