import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { historyKeys } from '@/entities/history';
import { announceRouteChange } from '@/shared/lib/a11y';

import { useChatMutation, useSttMutation } from '../api';
import type { ChatMessage } from '../model/types';

interface UseChatSessionOptions {
  initialMessages: ChatMessage[];
  context?: string;
  /**
   * Запись истории, в которую бэкенд дописывает переписку. Без неё диалог
   * живёт только в памяти экрана и пропадёт при выходе.
   */
  historyId?: string;
}

export const useChatSession = ({ initialMessages, context, historyId }: UseChatSessionOptions) => {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isSending, setIsSending] = useState(false);

  const chatMutation = useChatMutation();
  const sttMutation = useSttMutation();

  const sendText = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending) {
        return;
      }
      const trimmed = text.trim();
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: trimmed, at: new Date().toISOString() },
      ]);
      setIsSending(true);
      try {
        const result = await chatMutation.mutateAsync({ text: trimmed, context, historyId });
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: result.text, at: new Date().toISOString() },
        ]);
        // Сервер дописал обе реплики в запись — кэш истории протух.
        if (historyId) {
          void queryClient.invalidateQueries({ queryKey: historyKeys.all });
        }
        announceRouteChange(`Ответ: ${result.text}`);
      } catch {
        announceRouteChange('Ошибка отправки. Попробуйте ещё раз.');
      } finally {
        setIsSending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context, isSending, historyId],
  );

  const sendVoice = useCallback(
    async (blob: Blob, mimeType: string) => {
      try {
        const { text } = await sttMutation.mutateAsync({ blob, mimeType });
        await sendText(text);
      } catch {
        announceRouteChange('Ошибка распознавания речи. Попробуйте ещё раз.');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sendText],
  );

  return {
    messages,
    isSending,
    isTranscribing: sttMutation.isPending,
    sendText,
    sendVoice,
  };
};
