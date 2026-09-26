import { formatTime } from '@/shared/lib/date';

import './UserMessage.scss';

interface UserMessageProps {
  text?: string;
  /** Фото, отправленное вместе с сообщением. */
  imageUrl?: string;
  imageAlt?: string;
  /** Время сообщения в ISO — под пузырём выводится «часы:минуты». */
  time: string;
}

export const UserMessage = ({ text, imageUrl, imageAlt = '', time }: UserMessageProps) => (
  <div className="user-message">
    {imageUrl && (
      <div className="user-message__bubble user-message__bubble--media">
        <img className="user-message__image" src={imageUrl} alt={imageAlt} />
      </div>
    )}

    {text && (
      <div className="user-message__bubble">
        <p className="user-message__text">{text}</p>
      </div>
    )}

    <time className="user-message__time" dateTime={time}>
      {formatTime(time)}
    </time>
  </div>
);
