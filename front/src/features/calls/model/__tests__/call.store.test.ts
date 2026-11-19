import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (...args: unknown[]) => void;

/** Минимальный двойник socket.io-клиента: `fire` — событие «от сервера». */
const createFakeSocket = () => {
  const handlers = new Map<string, Handler[]>();
  const sent: Array<{ event: string; payload?: unknown }> = [];
  const socket = {
    connected: true,
    active: true,
    on: (event: string, handler: Handler) => {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
      return socket;
    },
    emit: (event: string, payload?: unknown) => {
      sent.push({ event, payload });
      return socket;
    },
    connect: vi.fn(() => socket),
    disconnect: vi.fn(() => {
      socket.connected = false;
      return socket;
    }),
    fire: (event: string, ...args: unknown[]) => {
      (handlers.get(event) ?? []).forEach((h) => h(...args));
    },
    sent,
  };
  return socket;
};

let fake = createFakeSocket();

vi.mock('../socket', () => ({
  loadSocket: () => Promise.resolve(fake),
}));

const { useCallStore } = await import('../call.store');

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const sentEvents = () => fake.sent.map((s) => s.event);

const MATCH = { url: 'wss://rtc', room: 'call_1', token: 't' };

describe('call.store', () => {
  beforeEach(() => {
    fake = createFakeSocket();
    useCallStore.setState({
      phase: 'idle',
      intent: null,
      match: null,
      incoming: null,
      bound: false,
      previewRole: null,
      missedAt: null,
    });
  });

  it('незрячий отменяет вызов явным call:cancel до разрыва сокета', async () => {
    useCallStore.getState().requestHelp();
    await flush();
    useCallStore.getState().cancelRequest();
    await flush();

    expect(sentEvents()).toEqual(['call:request', 'call:cancel']);
    expect(fake.disconnect).toHaveBeenCalled();
    expect(useCallStore.getState().phase).toBe('idle');
  });

  it('запоздалый call:matched после отмены не уводит в комнату', async () => {
    useCallStore.getState().requestHelp();
    await flush();
    useCallStore.getState().cancelRequest();
    await flush();

    fake.fire('call:matched', MATCH);

    expect(useCallStore.getState().match).toBeNull();
    expect(useCallStore.getState().phase).toBe('idle');
  });

  it('второй call:matched во время звонка не подменяет комнату', async () => {
    useCallStore.getState().requestHelp();
    await flush();
    fake.fire('call:matched', MATCH);
    fake.fire('call:matched', { ...MATCH, room: 'call_2' });

    expect(useCallStore.getState().match?.room).toBe('call_1');
  });

  it('волонтёр посреди звонка сразу отклоняет новый входящий', async () => {
    useCallStore.getState().goOnline();
    await flush();
    fake.fire('call:incoming', { requestId: 'r1', blindUserId: 'b1' });
    useCallStore.getState().accept('r1');
    await flush();
    fake.fire('call:matched', MATCH);

    fake.fire('call:incoming', { requestId: 'r2', blindUserId: 'b2' });

    expect(useCallStore.getState().phase).toBe('matched');
    expect(fake.sent.at(-1)).toEqual({ event: 'call:decline', payload: { requestId: 'r2' } });
  });

  it('отмена чужого вызова не сбрасывает текущий входящий', async () => {
    useCallStore.getState().goOnline();
    await flush();
    fake.fire('call:incoming', { requestId: 'r2', blindUserId: 'b' });

    fake.fire('call:cancelled', { requestId: 'r1', reason: 'withdrawn' });
    expect(useCallStore.getState().phase).toBe('incoming');

    fake.fire('call:cancelled', { requestId: 'r2', reason: 'withdrawn' });
    expect(useCallStore.getState().phase).toBe('volunteer-online');
    expect(useCallStore.getState().intent).toBe('volunteer');
  });

  it('пропущенный звонок снимает волонтёра с линии и отмечает missedAt', async () => {
    useCallStore.getState().goOnline();
    await flush();
    fake.fire('call:incoming', { requestId: 'r1', blindUserId: 'b' });

    fake.fire('call:cancelled', { requestId: 'r1', reason: 'missed' });

    const state = useCallStore.getState();
    expect(state.intent).toBeNull();
    expect(state.phase).toBe('idle');
    expect(state.missedAt).not.toBeNull();
    expect(fake.disconnect).toHaveBeenCalled();
  });

  it('отказ сервера в handshake: переподключаемся сами, пока волонтёр на линии', async () => {
    vi.useFakeTimers();
    try {
      useCallStore.getState().goOnline();
      await vi.runAllTimersAsync();
      fake.connected = false;
      fake.active = false;

      fake.fire('connect_error', new Error('Unauthorized'));
      await vi.advanceTimersByTimeAsync(3_000);

      expect(fake.connect).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('после ухода с линии ручного переподключения нет', async () => {
    vi.useFakeTimers();
    try {
      useCallStore.getState().goOnline();
      await vi.runAllTimersAsync();
      useCallStore.getState().goOffline();
      await vi.runAllTimersAsync();
      fake.active = false;
      fake.connect.mockClear();

      fake.fire('disconnect', 'io server disconnect');
      await vi.advanceTimersByTimeAsync(5_000);

      expect(fake.connect).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
