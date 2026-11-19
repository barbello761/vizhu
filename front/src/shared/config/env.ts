/**
 * Валидация переменных окружения в рантайме.
 * При запуске приложения выбрасывает ошибку, если обязательные переменные
 * отсутствуют или имеют неверный формат.
 * Добавляйте новые переменные сюда по мере роста проекта.
 *
 * Без zod намеренно: модуль грузится на старте любого экрана, и схема из пяти
 * правил тянула бы в стартовый чанк ~28 КБ gzip. zod остаётся в чанках форм.
 */
const APP_ENVS = ['development', 'production', 'test'] as const;
type AppEnv = (typeof APP_ENVS)[number];

const raw = import.meta.env;
const errors: string[] = [];

/** Пустая строка трактуется как «не задано». */
const optional = (value: string | undefined): string | undefined => (value ? value : undefined);
const flag = (value: string | undefined): boolean => value === 'true';

const apiUrl = optional(raw.VITE_API_URL) ?? '';
if (!apiUrl) {
  errors.push('VITE_API_URL обязателен');
}

const appEnvRaw = optional(raw.VITE_APP_ENV) ?? 'development';
if (!(APP_ENVS as readonly string[]).includes(appEnvRaw)) {
  errors.push(`VITE_APP_ENV: ожидается одно из ${APP_ENVS.join(', ')}, получено «${appEnvRaw}»`);
}

if (errors.length > 0) {
  console.error('❌ Некорректные переменные окружения:\n', errors.join('\n'));
  throw new Error('Некорректные переменные окружения. Смотрите .env.example для справки.');
}

const apiTimeoutRaw = optional(raw.VITE_API_TIMEOUT);
// Код, который бэкенд демо-стенда принимает, если звонок не дошёл
// (DEMO_OTP_CODE в infra/demo/.env). Пусто — строку с кодом не показываем.
const demoOtpCodeRaw = optional(raw.VITE_DEMO_OTP_CODE);

export const env = {
  apiUrl,
  /**
   * Socket.IO матчинга. Пусто → берём origin окна в рантайме: в проде фронт и
   * сокет на одном домене за nginx.
   */
  socketUrl:
    optional(raw.VITE_SOCKET_URL) ?? (typeof window !== 'undefined' ? window.location.origin : ''),
  apiTimeout: apiTimeoutRaw ? Number(apiTimeoutRaw) : 15_000,
  appTitle: optional(raw.VITE_APP_TITLE) ?? 'ВИЖУ',
  appEnv: appEnvRaw as AppEnv,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  /** DevTools включены только если VITE_ENABLE_DEVTOOLS=true (или в dev-режиме по умолчанию) */
  enableDevtools: flag(raw.VITE_ENABLE_DEVTOOLS),
  /** MSW-моки вместо настоящего бэкенда. Только dev, только по явному флагу. */
  enableMocks: flag(raw.VITE_ENABLE_MOCKS),
  /** Демо-стенд demo.vizhu.su: данные временные, вход с запасным кодом. */
  isDemo: flag(raw.VITE_DEMO_MODE),
  /** Запасной код входа демо-стенда, если звонок не дошёл. */
  demoOtpCode: demoOtpCodeRaw && /^\d{4}$/.test(demoOtpCodeRaw) ? demoOtpCodeRaw : undefined,
} as const;
