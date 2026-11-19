import { type ReactNode } from 'react';

import { DesktopIcon, DetailCard, PhonePortraitIcon } from '@/shared/ui';

import type { Session } from '../../api';
import {
  formatDay,
  formatLastActive,
  isMobilePlatform,
  sessionClientLabel,
} from '../../lib/describe-session';

interface SessionCardProps {
  session: Session;
  /**
   * Сеанс этого устройства. Для него показываем, когда вошли, а не
   * «последнюю активность» — она тут всегда «сейчас».
   */
  current?: boolean;
  /** Кнопка действия; получает id заголовка карточки. */
  action?: (titleId: string) => ReactNode;
  /** Для тестов и сторибука: относительно чего считать «3 часа назад». */
  now?: Date;
}

export const SessionCard = ({ session, current = false, action, now }: SessionCardProps) => {
  const activity = current ? (
    <>
      Вход: <time dateTime={session.createdAt}>{formatDay(session.createdAt, now)}</time>
    </>
  ) : (
    <>
      Активность:{' '}
      <time dateTime={session.lastActiveAt}>{formatLastActive(session.lastActiveAt, now)}</time>
    </>
  );

  return (
    <DetailCard
      icon={isMobilePlatform(session) ? <PhonePortraitIcon /> : <DesktopIcon />}
      title={session.deviceName}
      details={[sessionClientLabel(session), activity]}
      action={action}
    />
  );
};
