import { afterEach, describe, expect, it, vi } from 'vitest';

import { API_CACHE_NAME } from '@/shared/config/cache-names';

import { clearApiCache } from '../api-cache';

/** В jsdom Cache Storage нет — подставляем заглушку только там, где она нужна. */
const stubCaches = (impl: Partial<CacheStorage>) => {
  vi.stubGlobal('caches', impl as CacheStorage);
};

describe('clearApiCache', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('удаляет кэш ответов API — тот же, что заводит service worker', async () => {
    const del = vi.fn().mockResolvedValue(true);
    stubCaches({ delete: del });

    await clearApiCache();

    expect(del).toHaveBeenCalledWith(API_CACHE_NAME);
  });

  it('не падает там, где Cache Storage нет: Capacitor, тесты', async () => {
    // Проверка имеет смысл, только если глобала действительно нет.
    expect(typeof caches).toBe('undefined');

    await expect(clearApiCache()).resolves.toBeUndefined();
  });

  it('не срывает выход из аккаунта, если хранилище недоступно', async () => {
    stubCaches({ delete: vi.fn().mockRejectedValue(new Error('site data blocked')) });

    await expect(clearApiCache()).resolves.toBeUndefined();
  });
});
