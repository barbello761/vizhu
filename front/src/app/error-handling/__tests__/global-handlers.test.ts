import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCallStore } from '@/features/calls';
import { useAppErrorStore } from '@/shared/lib/app-error';
import type * as Connectivity from '@/shared/lib/connectivity';
import { queryClient } from '@/shared/lib/tanstack-query';

import { installGlobalErrorHandlers } from '../global-handlers';

const reportConnectionFailure = vi.fn();
vi.mock('@/shared/lib/connectivity', async (importOriginal) => ({
  ...(await importOriginal<typeof Connectivity>()),
  reportConnectionFailure: () => reportConnectionFailure(),
}));

const httpError = (status: number) =>
  new AxiosError('fail', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    statusText: '',
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

const rejection = (reason: unknown) => {
  const event = new Event('unhandledrejection') as PromiseRejectionEvent;
  Object.defineProperty(event, 'reason', { value: reason });
  window.dispatchEvent(event);
};

/** Запрос, который падает сразу, без повторов. */
const failQuery = (error: unknown, data?: unknown) => {
  if (data !== undefined) {
    queryClient.setQueryData(['profile'], data);
  }
  // Ключ один на тест (кэш чистится в beforeEach), ошибка в нём не нужна.
  return (
    queryClient
      // eslint-disable-next-line @tanstack/query/exhaustive-deps
      .fetchQuery({
        queryKey: ['profile'],
        queryFn: () => Promise.reject(error),
        retry: false,
        staleTime: 0,
      })
      .catch(() => undefined)
  );
};

describe('installGlobalErrorHandlers', () => {
  let uninstall: () => void;

  beforeEach(() => {
    reportConnectionFailure.mockReset();
    useAppErrorStore.setState({ current: null });
    useCallStore.setState({ phase: 'idle' });
    queryClient.clear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    uninstall = installGlobalErrorHandlers();
  });

  afterEach(() => {
    uninstall();
    vi.restoreAllMocks();
  });

  it('промис без catch — экран ошибки с перезагрузкой', () => {
    rejection(new TypeError('boom'));

    expect(useAppErrorStore.getState().current).toEqual({
      error: { kind: 'unknown', code: 'TypeError', detail: 'boom' },
      recovery: 'reload',
    });
  });

  it('штатные отказы (отмена, автозапуск) экран не поднимают', () => {
    rejection(new DOMException('no gesture', 'NotAllowedError'));

    expect(useAppErrorStore.getState().current).toBeNull();
  });

  it('во время звонка сбой не копится — после разговора окно не всплывёт', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    useCallStore.setState({ phase: 'matched' });
    rejection(new Error('Could not start audio source'));

    expect(useAppErrorStore.getState().current).toBeNull();
  });

  it('5xx на загрузке данных без кэша — экран с перезапросом', async () => {
    await failQuery(httpError(500));

    expect(useAppErrorStore.getState().current?.recovery).toBe('refetch');
  });

  it('5xx при фоновом обновлении, когда данные уже есть, — молчим', async () => {
    await failQuery(httpError(500), { name: 'Иван' });

    expect(useAppErrorStore.getState().current).toBeNull();
  });

  it('4xx разбирают сами экраны', async () => {
    await failQuery(httpError(404));

    expect(useAppErrorStore.getState().current).toBeNull();
  });

  it('502 от прокси — не ошибка данных, а проверка связи', async () => {
    await failQuery(httpError(502));

    expect(useAppErrorStore.getState().current).toBeNull();
    expect(reportConnectionFailure).toHaveBeenCalled();
  });
});
