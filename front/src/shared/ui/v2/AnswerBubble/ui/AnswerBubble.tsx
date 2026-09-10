import { type PointerEvent, useCallback, useEffect, useRef, useState } from 'react';

import './AnswerBubble.scss';

/** Через столько миллисекунд удержания плашка ответа прячется. */
const HOLD_DELAY = 600;
/** Сдвиг пальца, после которого удержание считается скроллом текста. */
const HOLD_MOVE_TOLERANCE = 10;

interface AnswerBubbleProps {
  text: string;
  /** Ответ не получен — текст красится в цвет ошибки. */
  isError?: boolean;
  className?: string;
}

/**
 * Плашка с ответом нейропомощника поверх кадра.
 *
 * Удержание прячет плашку, чтобы посмотреть снимок целиком. Скринридеру об
 * этом сказано в имени области — иначе жест остался бы незаметным.
 */
export const AnswerBubble = ({ text, isError = false, className }: AnswerBubbleProps) => {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHeld, setIsHeld] = useState(false);

  useEffect(
    () => () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    },
    [],
  );

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const startY = event.clientY;
    const controller = new AbortController();
    const { signal } = controller;

    const stop = () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      controller.abort();
    };

    // Палец поехал до срабатывания таймера — человек листает текст, а не прячет
    // плашку. После срабатывания ref пуст, и движение уже ничего не отменяет.
    document.addEventListener(
      'pointermove',
      (moveEvent) => {
        if (holdTimerRef.current && Math.abs(moveEvent.clientY - startY) > HOLD_MOVE_TOLERANCE) {
          stop();
        }
      },
      { signal },
    );

    const release = () => {
      stop();
      setIsHeld(false);
    };
    document.addEventListener('pointerup', release, { signal });
    document.addEventListener('pointercancel', release, { signal });

    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      setIsHeld(true);
    }, HOLD_DELAY);
  }, []);

  const cls = ['answer-bubble', isHeld && 'answer-bubble--held', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cls}
      role="article"
      aria-label="Ответ нейропомощника. Удерживайте, чтобы временно скрыть."
      onPointerDown={handlePointerDown}
    >
      <div className="answer-bubble__scroll">
        <p
          className={['answer-bubble__text', isError && 'answer-bubble__text--error']
            .filter(Boolean)
            .join(' ')}
          aria-live="polite"
        >
          {text}
        </p>
      </div>
      <span className="answer-bubble__fade" aria-hidden="true" />
    </div>
  );
};
