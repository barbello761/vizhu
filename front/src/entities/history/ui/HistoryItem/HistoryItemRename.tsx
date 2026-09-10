import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { CheckmarkIcon, CloseIcon } from '@/shared/ui/v2';

import './HistoryItem.scss';

interface HistoryItemRenameProps {
  title: string;
  onSubmit: (title: string) => void;
  onCancel: () => void;
}

export const HistoryItemRename = ({ title, onSubmit, onCancel }: HistoryItemRenameProps) => {
  const fieldRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(title);

  useEffect(() => {
    fieldRef.current?.focus();
    fieldRef.current?.select();
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = draft.trim();
    if (next && next !== title) {
      onSubmit(next);
      return;
    }
    onCancel();
  };

  // Escape отменяет правку и не долетает до внешних обработчиков.
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    }
  };

  return (
    <form className="history-item__rename" onSubmit={handleSubmit}>
      <input
        ref={fieldRef}
        type="text"
        className="history-item__rename-field"
        aria-label={`Новое название записи «${title}»`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button type="submit" className="history-item__rename-action" aria-label="Сохранить название">
        <CheckmarkIcon />
      </button>
      <button
        type="button"
        className="history-item__rename-action"
        aria-label="Отменить переименование"
        onClick={onCancel}
      >
        <CloseIcon />
      </button>
    </form>
  );
};
