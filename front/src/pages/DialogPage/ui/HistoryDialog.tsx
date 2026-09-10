import { useMemo } from 'react';
import { useNavigate } from 'react-router';

import { useHistoryEntry } from '@/entities/history';
import type { ChatMessage } from '@/features/ai-dialog';

import { DialogChat } from './DialogChat';

import './DialogPage.scss';

interface HistoryDialogProps {
  id: string;
}

/** Диалог о фото из истории: та же переписка, поднятая из бэкенда. */
export const HistoryDialog = ({ id }: HistoryDialogProps) => {
  const navigate = useNavigate();
  const { data: entry, isPending, isError } = useHistoryEntry(id);

  const messages = useMemo<ChatMessage[]>(
    () => entry?.messages.map(({ role, text, timestamp }) => ({ role, text, at: timestamp })) ?? [],
    [entry],
  );

  const goBack = () => void navigate('/history');

  if (isPending) {
    return (
      <main id="main-content" className="dialog-page" tabIndex={-1} aria-busy="true">
        <p className="dialog-page__status" role="status">
          Загружаем запись…
        </p>
      </main>
    );
  }

  if (isError || !entry) {
    return (
      <main id="main-content" className="dialog-page" tabIndex={-1} aria-label="Запись не найдена">
        <p className="dialog-page__status" role="alert">
          Не удалось открыть запись. Вернитесь к истории и попробуйте ещё раз.
        </p>
      </main>
    );
  }

  // Контекст для новых вопросов — последний ответ нейропомощника в записи.
  const context = [...messages].reverse().find((message) => message.role === 'assistant')?.text;

  return (
    <DialogChat
      title={entry.title}
      initialMessages={messages}
      context={context}
      exitLabel="Назад, к истории"
      onExit={goBack}
    />
  );
};
