import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pingServer = vi.fn();
vi.mock('@/shared/api/health', () => ({ pingServer: () => pingServer() }));

// Модуль держит состояние (таймер heartbeat, время последнего успеха) —
// каждый тест получает свежую копию.
const load = async () => {
  vi.resetModules();
  return import('..');
};

describe('connectivity monitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pingServer.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('сервер не ответил — статус server-down с кодом пинга', async () => {
    const { checkConnection, useConnectivityStore } = await load();
    pingServer.mockResolvedValue({ ok: false, code: 'TIMEOUT' });

    await expect(checkConnection()).resolves.toBe(false);
    expect(useConnectivityStore.getState()).toMatchObject({
      status: 'server-down',
      code: 'TIMEOUT',
    });
  });

  it('без сети даже не пингует — сразу offline', async () => {
    const { checkConnection, useConnectivityStore } = await load();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    await checkConnection();
    expect(pingServer).not.toHaveBeenCalled();
    expect(useConnectivityStore.getState().status).toBe('offline');
  });

  it('параллельные проверки делят один пинг', async () => {
    const { checkConnection } = await load();
    pingServer.mockResolvedValue({ ok: true });

    await Promise.all([checkConnection(), checkConnection(), checkConnection()]);
    expect(pingServer).toHaveBeenCalledTimes(1);
  });

  it('пока связи нет, проверяет сам и сообщает о восстановлении', async () => {
    const { checkConnection, onConnectionRestored, useConnectivityStore } = await load();
    const restored = vi.fn();
    onConnectionRestored(restored);
    pingServer.mockResolvedValueOnce({ ok: false, code: 'ERR_NETWORK' });
    pingServer.mockResolvedValue({ ok: true });

    await checkConnection();
    expect(restored).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(3000);
    expect(pingServer).toHaveBeenCalledTimes(2);
    expect(useConnectivityStore.getState().status).toBe('online');
    expect(restored).toHaveBeenCalledTimes(1);
  });

  it('сразу после удачного пинга упавший запрос новую проверку не запускает', async () => {
    const { checkConnection, reportConnectionFailure } = await load();
    pingServer.mockResolvedValue({ ok: true });

    await checkConnection();
    reportConnectionFailure();
    expect(pingServer).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5000);
    reportConnectionFailure();
    expect(pingServer).toHaveBeenCalledTimes(2);
  });

  it('событие offline показывает экран сразу, без пинга', async () => {
    const { startConnectivityMonitor, useConnectivityStore } = await load();
    const stop = startConnectivityMonitor();

    window.dispatchEvent(new Event('offline'));
    expect(useConnectivityStore.getState().status).toBe('offline');
    stop();
  });
});
