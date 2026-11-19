import { AxiosError, AxiosHeaders, CanceledError } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatErrorCode, isBenignError, isConnectionError, toAppError } from '..';

const axiosError = (status?: number, data?: unknown, code = 'ERR_BAD_RESPONSE') =>
  new AxiosError(
    'Request failed',
    status === undefined ? 'ERR_NETWORK' : code,
    undefined,
    undefined,
    status === undefined
      ? undefined
      : { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } },
  );

describe('toAppError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('без сети — offline, что бы ни бросили', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    expect(toAppError(new Error('x'))).toEqual({ kind: 'offline', code: 'OFFLINE' });
  });

  it('запрос без ответа — сервер недоступен, код от axios', () => {
    const error = toAppError(axiosError());

    expect(error).toEqual({ kind: 'server-unreachable', code: 'ERR_NETWORK' });
    expect(isConnectionError(error)).toBe(true);
  });

  it.each([502, 503, 504])('%i от прокси — тоже обрыв связи, а не ошибка сервера', (status) => {
    expect(toAppError(axiosError(status)).kind).toBe('server-unreachable');
  });

  it('500 — ошибка сервера со статусом и сообщением Nest', () => {
    const error = toAppError(axiosError(500, { message: 'Internal server error' }));

    expect(error).toEqual({ kind: 'server', code: '500', detail: 'Internal server error' });
    expect(formatErrorCode(error)).toBe('500 — Internal server error');
  });

  it('недогруженный чанк экрана распознаётся отдельно', () => {
    const error = new TypeError('Failed to fetch dynamically imported module: /assets/x.js');

    expect(toAppError(error)).toEqual({ kind: 'chunk', code: 'CHUNK_LOAD' });
  });

  it('исключение в коде — имя и сообщение, длинное обрезается', () => {
    const error = toAppError(new TypeError('a'.repeat(500)));

    expect(error.kind).toBe('unknown');
    expect(error.code).toBe('TypeError');
    expect(error.detail?.length).toBeLessThanOrEqual(121);
  });

  it('ответ роутера ({ status }) — по статусу', () => {
    expect(toAppError({ status: 404, statusText: 'Not Found' })).toEqual({
      kind: 'unknown',
      code: '404',
      detail: 'Not Found',
    });
  });
});

describe('isBenignError', () => {
  it('отмена запроса, AbortError, запрет автозапуска и 401 — штатные', () => {
    expect(isBenignError(new CanceledError())).toBe(true);
    expect(isBenignError(new DOMException('x', 'AbortError'))).toBe(true);
    expect(isBenignError(new DOMException('x', 'NotAllowedError'))).toBe(true);
    expect(isBenignError(axiosError(401))).toBe(true);
  });

  it('настоящие ошибки — нет', () => {
    expect(isBenignError(new TypeError('boom'))).toBe(false);
    expect(isBenignError(axiosError(500))).toBe(false);
  });
});
