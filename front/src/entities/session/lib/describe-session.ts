import type { Session } from '../api';

/**
 * Окно «только что». Активность пишется при обновлении токенов, а оно
 * случается раз в ~15 минут работы: точнее этого времени мы просто не знаем,
 * и «3 минуты назад» было бы враньём.
 */
const RECENT_MS = 15 * 60_000;
const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;

const relative = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' });

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** «12 ноября», а для прошлых лет — «12 ноября 2025 г.». */
export const formatDay = (iso: string, now: Date = new Date()): string => {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(date);
};

/** «только что», «40 минут назад», «3 часа назад», «вчера», «12 ноября». */
export const formatLastActive = (iso: string, now: Date = new Date()): string => {
  const date = new Date(iso);
  const diff = now.getTime() - date.getTime();

  if (diff < RECENT_MS) {
    return 'только что';
  }
  if (diff < HOUR_MS) {
    return relative.format(-Math.floor(diff / 60_000), 'minute');
  }
  if (diff < DAY_MS) {
    return relative.format(-Math.floor(diff / HOUR_MS), 'hour');
  }
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  return days === 1 ? relative.format(-1, 'day') : formatDay(iso, now);
};

/** Чем вошли: приложение или браузер (сам браузер уже назван в deviceName). */
export const sessionClientLabel = (session: Pick<Session, 'client'>): string =>
  session.client === 'native' ? 'Приложение ВИЖУ' : 'Веб-версия';

export const isMobilePlatform = (session: Pick<Session, 'platform'>): boolean =>
  session.platform === 'android' || session.platform === 'ios';
