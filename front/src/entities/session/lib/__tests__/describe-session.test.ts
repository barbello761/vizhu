import { describe, expect, it } from 'vitest';

import {
  formatDay,
  formatLastActive,
  isMobilePlatform,
  sessionClientLabel,
} from '../describe-session';

const NOW = new Date(2026, 10, 19, 18, 0);
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const MIN = 60_000;

describe('formatLastActive', () => {
  it('точнее интервала обновления токенов не врём — «только что»', () => {
    expect(formatLastActive(ago(0), NOW)).toBe('только что');
    expect(formatLastActive(ago(14 * MIN), NOW)).toBe('только что');
  });

  it('минуты и часы — относительным временем', () => {
    expect(formatLastActive(ago(40 * MIN), NOW)).toBe('40 минут назад');
    expect(formatLastActive(ago(3 * 60 * MIN), NOW)).toBe('3 часа назад');
  });

  it('вчера и дальше — днём', () => {
    expect(formatLastActive(new Date(2026, 10, 18, 9, 0).toISOString(), NOW)).toBe('вчера');
    expect(formatLastActive(new Date(2026, 10, 12, 9, 0).toISOString(), NOW)).toBe('12 ноября');
  });
});

describe('formatDay', () => {
  it('год показываем только для прошлых лет', () => {
    expect(formatDay(new Date(2026, 0, 5).toISOString(), NOW)).toBe('5 января');
    expect(formatDay(new Date(2025, 0, 5).toISOString(), NOW)).toMatch(/^5 января 2025/);
  });
});

describe('подписи', () => {
  it('клиент и тип устройства', () => {
    expect(sessionClientLabel({ client: 'native' })).toBe('Приложение ВИЖУ');
    expect(sessionClientLabel({ client: 'web' })).toBe('Веб-версия');
    expect(isMobilePlatform({ platform: 'ios' })).toBe(true);
    expect(isMobilePlatform({ platform: 'windows' })).toBe(false);
  });
});
