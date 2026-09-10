import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { ActionMenu } from '../../ActionMenu';
import { AddIcon, CloseIcon, SendIcon } from '../../icons';

import './ChatInput.scss';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  /** Пункты меню вложений; без них кнопка «плюс» не рендерится. */
  attachItems?: ReactNode;
  attachLabel?: string;
  className?: string;
}

export const ChatInput = ({
  value,
  onChange,
  onSend,
  label,
  placeholder,
  disabled = false,
  attachItems,
  attachLabel = 'Прикрепить фото',
  className,
}: ChatInputProps) => {
  const menuId = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const canSend = !disabled && value.trim().length > 0;
  const isFilled = value.length > 0;

  // Поле растёт под текст: сбрасываем высоту и подгоняем под содержимое,
  // потолок задан в CSS через max-height.
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) {
      return;
    }
    field.style.height = 'auto';
    field.style.height = `${field.scrollHeight}px`;
  }, [value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        onSend();
      }
    }
  };

  const cls = ['chat-input__row', isFilled && 'chat-input__row--filled'].filter(Boolean).join(' ');

  return (
    <div className={['chat-input', className].filter(Boolean).join(' ')}>
      {attachItems && isMenuOpen && (
        <ActionMenu id={menuId} aria-label={attachLabel} className="chat-input__menu">
          {attachItems}
        </ActionMenu>
      )}

      <div className={cls}>
        {attachItems && (
          <button
            type="button"
            className="chat-input__attach"
            aria-label={isMenuOpen ? 'Закрыть меню вложений' : attachLabel}
            aria-expanded={isMenuOpen}
            aria-controls={menuId}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <CloseIcon /> : <AddIcon />}
          </button>
        )}

        <textarea
          ref={fieldRef}
          rows={1}
          className="chat-input__field"
          aria-label={label}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />

        <button
          type="button"
          className="chat-input__send"
          aria-label="Отправить сообщение"
          disabled={!canSend}
          onClick={onSend}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
};
