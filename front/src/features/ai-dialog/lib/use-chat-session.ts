import { useCallback, useState } from 'react';

import { announceRouteChange } from '@/shared/lib/a11y';

import { useChatMutation, useSttMutation } from '../api';
import type { ChatMessage } from '../model/types';

interface UseChatSessionOptions {
  initialMessages: ChatMessage[];
  context?: string;
}

export const useChatSession = ({ initialMessages, context }: UseChatSessionOptions) => {
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
        const result = await chatMutation.mutateAsync({ text: trimmed, context });
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: result.text, at: new Date().toISOString() },
        ]);
        announceRouteChange(`Ответ: ${result.text}`);
      } catch {
        announceRouteChange('Ошибка отправки. Попробуйте ещё раз.');
      } finally {
        setIsSending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context, isSending],
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
