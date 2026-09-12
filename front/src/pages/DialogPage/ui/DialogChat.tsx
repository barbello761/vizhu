import { type ReactNode, useEffect, useRef, useState } from 'react';

import { type ChatMessage, useChatSession } from '@/features/ai-dialog';
import { announceRouteChange } from '@/shared/lib/a11y';
import { AiMessage, Button, ChatInput, ChevronBackIcon, UserMessage } from '@/shared/ui/v2';
import { VoiceRecordOverlay } from '@/widgets/VoiceRecordOverlay';

import './DialogPage.scss';

interface DialogChatProps {
  title: string;
  /** Снимок, с которого начался разговор; у записи из истории его нет. */
  photoUrl?: string | null;
  photoAt?: string | null;
  initialMessages: ChatMessage[];
  /** Текст, который уходит в бэкенд как контекст каждого вопроса. */
  context?: string;
  /** Запись истории, в которую бэкенд дописывает переписку. */
  historyId?: string;
  /** Открыть запись голоса сразу — переход с кнопки «Спросить голосом». */
  autoOpenVoice?: boolean;
  /** Куда ведёт кнопка возврата — попадает в её имя для скринридера. */
  exitLabel?: string;
  /** Пункты меню вложений; без них кнопка «плюс» не рендерится. */
  attachItems?: ReactNode;
  onExit: () => void;
}

/**
 * Экран переписки о фото.
 *
 * Компонент ничего не знает о том, откуда взялась переписка: активный снимок
 * и запись из истории приходят одинаковым набором сообщений.
 */
export const DialogChat = ({
  title,
  photoUrl,
  photoAt,
  initialMessages,
  context,
  historyId,
  autoOpenVoice = false,
  exitLabel = 'Выйти на главную',
  attachItems,
  onExit,
}: DialogChatProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState('');
  const [isVoiceOpen, setIsVoiceOpen] = useState(autoOpenVoice);

  const { messages, isSending, isTranscribing, sendText, sendVoice } = useChatSession({
    initialMessages,
    context,
    historyId,
  });

  useEffect(() => {
    announceRouteChange(`${title}. Задайте вопрос.`);
  }, [title]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = chatInput.trim();
    if (!text || isSending) {
      return;
    }
    setChatInput('');
    void sendText(text);
  };

  const handleVoiceSend = async (blob: Blob, mimeType: string) => {
    setIsVoiceOpen(false);
    await sendVoice(blob, mimeType);
  };

  const handleCopyAnswer = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      announceRouteChange('Ответ скопирован в буфер обмена');
    } catch {
      announceRouteChange('Не удалось скопировать ответ');
    }
  };

  return (
    <main id="main-content" className="dialog-page" tabIndex={-1} aria-label={title}>
      <header className="dialog-page__header">
        <Button variant="icon" aria-label={exitLabel} onClick={onExit}>
          <ChevronBackIcon />
        </Button>
        <h1 className="dialog-page__title">{title}</h1>
        <span className="dialog-page__header-spacer" aria-hidden="true" />
      </header>

      <div className="dialog-page__body">
        <div className="dialog-page__messages" aria-label="Сообщения">
          {photoUrl && photoAt && (
            <UserMessage
              imageUrl={photoUrl}
              imageAlt="Снимок, отправленный нейропомощнику"
              time={photoAt}
            />
          )}

          {messages.map((message, index) =>
            message.role === 'user' ? (
              <UserMessage key={index} text={message.text} time={message.at} />
            ) : (
              <AiMessage
                key={index}
                text={message.text}
                time={message.at}
                onCopy={() => void handleCopyAnswer(message.text)}
              />
            ),
          )}

          {isSending && <AiMessage state="thinking" />}

          <div ref={messagesEndRef} aria-hidden="true" />
        </div>

        <ChatInput
          className="dialog-page__input"
          value={chatInput}
          onChange={setChatInput}
          onSend={handleSend}
          label="Текст сообщения"
          placeholder="Например, что вокруг..."
          disabled={isSending}
          attachItems={attachItems}
        />
      </div>

      {isVoiceOpen && (
        <VoiceRecordOverlay
          onClose={() => setIsVoiceOpen(false)}
          onSend={handleVoiceSend}
          isSending={isTranscribing}
        />
      )}
    </main>
  );
};
