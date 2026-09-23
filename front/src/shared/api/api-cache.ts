import { API_CACHE_NAME } from '@/shared/config/cache-names';

/**
 * Выбросить закэшированные ответы API.
 *
 * Service worker складывает ответы авторизованных GET-запросов в Cache Storage
 * (правило NetworkFirst в vite.config.ts), и переживают они и выход из
 * аккаунта, и закрытие вкладки. На общем устройстве следующий вошедший достал
 * бы оттуда чужой профиль, поэтому сессию завершаем вместе с кэшем.
 *
 * Тихо ничего не делает там, где Cache Storage нет: внутри Capacitor SW не
 * регистрируется, в jsdom-тестах `caches` отсутствует.
 */
export const clearApiCache = async (): Promise<void> => {
  if (typeof caches === 'undefined') {
    return;
  }

  try {
    await caches.delete(API_CACHE_NAME);
  } catch {
    // Хранилище недоступно (приватный режим, запрет на site data) — выход из
    // аккаунта из-за этого срывать нельзя.
  }
};
