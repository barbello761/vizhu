import { formatTime } from '@/shared/lib/date';

import { CopyIcon, ThumbsDownIcon, ThumbsUpIcon, VizhuIcon } from '../../icons';

import './AiMessage.scss';

export type AiMessageState = 'answer' | 'thinking' | 'retrying';

const STATUS_TEXT: Record<Exclude<AiMessageState, 'answer'>, string> = {
  thinking: 'Думаю...',
  retrying: 'Думаю дольше чем обычно.\nПробую ещё раз...',
};

interface AiMessageProps {
  state?: AiMessageState;
  /** Текст ответа — только для состояния `answer`. */
  text?: string;
  /** Время сообщения в ISO — под ответом выводится «часы:минуты». */
  time?: string;
  /** Кнопки под ответом рендерятся только с обработчиком. */
  onCopy?: () => void;
  onLike?: () => void;
  onDislike?: () => void;
}

export const AiMessage = ({
  state = 'answer',
  text,
  time,
  onCopy,
  onLike,
  onDislike,
}: AiMessageProps) => {
  if (state !== 'answer') {
    return (
      <div className="ai-message">
        <div className="ai-message__row">
          <span className="ai-message__avatar" aria-hidden="true">
            <VizhuIcon />
          </span>
          <p className="ai-message__status" role="status">
            {STATUS_TEXT[state]}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-message">
      <p className="ai-message__text">{text}</p>

      <div className="ai-message__row">
        <span className="ai-message__avatar" aria-hidden="true">
          <VizhuIcon />
        </span>

        {onCopy && (
          <button
            type="button"
            className="ai-message__action"
            aria-label="Скопировать ответ"
            onClick={onCopy}
          >
            <CopyIcon />
          </button>
        )}

        {onLike && (
          <button
            type="button"
            className="ai-message__action"
            aria-label="Ответ понравился"
            onClick={onLike}
          >
            <ThumbsUpIcon />
          </button>
        )}

        {onDislike && (
          <button
            type="button"
            className="ai-message__action"
            aria-label="Ответ не понравился"
            onClick={onDislike}
          >
            <ThumbsDownIcon />
          </button>
        )}

        {time && (
          <time className="ai-message__time" dateTime={time}>
            {formatTime(time)}
          </time>
        )}
      </div>
    </div>
  );
};
