import { useEffect, useId, useRef } from 'react';

import { Button } from '../../button';
import { AlertTriangleIcon } from '../../icons/alert-triangle-icon';

import './error-screen.scss';

export interface ErrorScreenProps {
  /** Что случилось и что делать — человеческим языком. */
  message: string;
  /** Код для поддержки: HTTP-статус или код сетевой ошибки. */
  code?: string;
  /**
   * Заголовок экрана. В макете его нет, поэтому он только для скринридера:
   * без него у экрана нет имени, и TalkBack/VoiceOver читали бы «основное».
   */
  title?: string;
  retryLabel?: string;
  /** Идёт повторная попытка — кнопка показывает спиннер и не нажимается. */
  retrying?: boolean;
  onRetry: () => void;
  /**
   * `main` — экран целиком вместо приложения (упал рендер, ошибка роутера):
   * свой `<main id="main-content">`, фокус ставится на него.
   * `div` — содержимое окна поверх приложения (`Modal`): там `<main>` уже есть
   * под окном, второй с тем же id сломал бы skip-link.
   */
  as?: 'main' | 'div';
}

/**
 * Экран ошибки по макету «Нет соединения с сервером»: иконка-предупреждение,
 * текст с кодом по центру, «Попробовать снова» внизу. Единственный фолбэк
 * приложения: им закрыты падения рендера, ошибки роутера, недоступный сервер
 * и отсутствие сети.
 *
 * Текст — `role="alert"`: скринридер произносит его сразу при появлении,
 * не дожидаясь, пока человек доберётся до него свайпами.
 */
export const ErrorScreen = ({
  message,
  code,
  title = 'Ошибка',
  retryLabel = 'Попробовать снова',
  retrying = false,
  onRetry,
  as = 'main',
}: ErrorScreenProps) => {
  const titleId = useId();
  const mainRef = useRef<HTMLElement>(null);

  // Экран появляется на месте того, что упало, — фокус там уже потерян.
  // Внутри окна фокусом управляет Modal.
  useEffect(() => {
    mainRef.current?.focus();
  }, []);

  const content = (
    <>
      <div className="error-screen__body">
        <h1 id={titleId} className="visually-hidden">
          {title}
        </h1>
        <AlertTriangleIcon className="error-screen__icon" />
        <p className="error-screen__text" role="alert">
          {message}
          {code && (
            <>
              <br />
              {`(Код ошибки: ${code})`}
            </>
          )}
        </p>
      </div>

      <div className="error-screen__actions">
        <Button loading={retrying} onClick={onRetry}>
          {retryLabel}
        </Button>
      </div>
    </>
  );

  // У div нет роли, и aria-labelledby на нём ничего не значит: имя даёт окно
  // вокруг (Modal aria-label), заголовок остаётся для навигации по заголовкам.
  if (as === 'div') {
    return <div className="error-screen">{content}</div>;
  }

  return (
    <main
      ref={mainRef}
      id="main-content"
      tabIndex={-1}
      className="error-screen"
      aria-labelledby={titleId}
    >
      {content}
    </main>
  );
};
