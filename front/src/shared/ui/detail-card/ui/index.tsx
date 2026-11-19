import { type ReactNode, useId } from 'react';

import './detail-card.scss';

export interface DetailCardProps {
  /** Иконка слева, декоративная: смысл обязан нести заголовок. */
  icon: ReactNode;
  title: string;
  /**
   * Уровень заголовка. Карточки в списке — обычно `h3` под `h2` раздела:
   * скринридер прыгает по ним клавишей «следующий заголовок».
   */
  titleAs?: 'h2' | 'h3' | 'h4' | 'p';
  /** Строки под заголовком — по одной на факт («Приложение ВИЖУ», «Вход: 12 ноября»). */
  details?: readonly ReactNode[];
  /**
   * Действие над карточкой (кнопка) — отдельной строкой снизу, а не вся
   * карточка-кнопка: так текст читается как текст, а у действия своё
   * короткое имя. Получает id заголовка, чтобы сослаться на него в подписи.
   */
  action?: (titleId: string) => ReactNode;
  className?: string;
}

/**
 * Плашка «иконка + заголовок + подробности» с необязательным действием.
 * Неинтерактивна сама по себе: фокус получает только кнопка в `action`.
 */
export const DetailCard = ({
  icon,
  title,
  titleAs: Title = 'h3',
  details = [],
  action,
  className,
}: DetailCardProps) => {
  const titleId = useId();

  return (
    <div className={['detail-card', className].filter(Boolean).join(' ')}>
      <div className="detail-card__main">
        <span className="detail-card__icon" aria-hidden="true">
          {icon}
        </span>
        <div className="detail-card__text">
          <Title id={titleId} className="detail-card__title">
            {title}
          </Title>
          {details.map((line, index) => (
            // Строки статичны и не переставляются — индекс как ключ безопасен.
            <p key={index} className="detail-card__detail">
              {line}
            </p>
          ))}
        </div>
      </div>
      {action && <div className="detail-card__action">{action(titleId)}</div>}
    </div>
  );
};
