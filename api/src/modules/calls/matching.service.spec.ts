import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { InMemoryMatchingStore } from './in-memory-matching.store';
import { MatchingService } from './matching.service';

type Emitted = { socketId: string; event: string; payload: unknown };

const setup = async () => {
  const emitted: Emitted[] = [];
  const server = {
    to: (socketId: string) => ({
      emit: (event: string, payload: unknown) =>
        emitted.push({ socketId, event, payload }),
    }),
  };
  const calls = {
    ensureRoom: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    createToken: jest
      .fn()
      .mockImplementation(
        ({ room, identity }: { room: string; identity: string }) =>
          Promise.resolve({
            url: 'wss://rtc.vizhu.su',
            room,
            token: `token-for-${identity}`,
          }),
      ),
  };
  const store = new InMemoryMatchingStore();
  const matching = new MatchingService(calls as never, store);
  matching.bindServer(server as never);
  await matching.onModuleInit();

  const events = (socketId: string, event: string) =>
    emitted.filter((e) => e.socketId === socketId && e.event === event);
  const lastIncoming = (socketId: string) =>
    events(socketId, 'call:incoming').at(-1)?.payload as
      | { requestId: string }
      | undefined;

  const connect = (userId: string) =>
    matching.userConnected(userId, `socket-${userId}`);

  return { matching, store, calls, emitted, events, lastIncoming, connect };
};

describe('MatchingService', () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  afterEach(async () => {
    jest.useRealTimers();
    await ctx?.matching.onModuleDestroy();
  });

  it('matches a blind user and a volunteer without changing socket events', async () => {
    ctx = await setup();
    const { matching, emitted, lastIncoming, connect, calls } = ctx;

    await connect('volunteer');
    await matching.volunteerOnline('volunteer');
    await connect('blind');
    await matching.requestHelp('blind');

    const incoming = emitted.find(
      (item) =>
        item.socketId === 'socket-volunteer' && item.event === 'call:incoming',
    );
    expect(incoming?.payload).toMatchObject({ blindUserId: 'blind' });

    await matching.accept(
      lastIncoming('socket-volunteer')!.requestId,
      'volunteer',
    );

    const matches = emitted.filter((item) => item.event === 'call:matched');
    expect(matches).toHaveLength(2);
    expect(matches.map((item) => item.socketId).sort()).toEqual([
      'socket-blind',
      'socket-volunteer',
    ]);
    expect((matches[0].payload as { room: string }).room).toBe(
      (matches[1].payload as { room: string }).room,
    );
    expect(calls.ensureRoom).toHaveBeenCalledTimes(1);
  });

  it('одновременные call:request одного незрячего звонят только одному волонтёру', async () => {
    ctx = await setup();
    const { matching, events, connect } = ctx;

    await connect('v1');
    await connect('v2');
    await matching.volunteerOnline('v1');
    await matching.volunteerOnline('v2');
    await connect('blind');

    await Promise.all([
      matching.requestHelp('blind'),
      matching.requestHelp('blind'),
    ]);

    const rings =
      events('socket-v1', 'call:incoming').length +
      events('socket-v2', 'call:incoming').length;
    expect(rings).toBe(1);
    expect(await matching.availableCount()).toBe(1);
  });

  it('отмена незрячим снимает входящий у волонтёра и возвращает его в пул', async () => {
    ctx = await setup();
    const { matching, events, lastIncoming, connect } = ctx;

    await connect('volunteer');
    await matching.volunteerOnline('volunteer');
    await connect('blind');
    await matching.requestHelp('blind');
    const { requestId } = lastIncoming('socket-volunteer')!;

    await matching.cancelRequest('blind');

    expect(
      events('socket-volunteer', 'call:cancelled').at(-1)?.payload,
    ).toEqual({
      requestId,
      reason: 'withdrawn',
    });
    expect(await matching.availableCount()).toBe(1);

    // Принять уже отменённый вызов нельзя.
    await matching.accept(requestId, 'volunteer');
    expect(events('socket-volunteer', 'call:matched')).toHaveLength(0);
  });

  it('отмена из очереди: встающий на линию волонтёр не получает фантомный вызов', async () => {
    ctx = await setup();
    const { matching, events, connect } = ctx;

    await connect('blind');
    await matching.requestHelp('blind');
    expect(events('socket-blind', 'call:waiting')).toHaveLength(1);

    await matching.cancelRequest('blind');
    await connect('volunteer');
    await matching.volunteerOnline('volunteer');

    expect(events('socket-volunteer', 'call:incoming')).toHaveLength(0);
    expect(await matching.availableCount()).toBe(1);
  });

  it('после отказа волонтёр остаётся в пуле, а вызов уходит другому', async () => {
    ctx = await setup();
    const { matching, events, lastIncoming, connect } = ctx;

    await connect('v1');
    await matching.volunteerOnline('v1');
    await connect('blind');
    await matching.requestHelp('blind');
    const first = lastIncoming('socket-v1')!;

    await connect('v2');
    await matching.volunteerOnline('v2');
    await matching.decline(first.requestId, 'v1');

    expect(lastIncoming('socket-v2')?.requestId).toBe(first.requestId);
    expect(events('socket-v1', 'call:incoming')).toHaveLength(1);
    expect(await matching.availableCount()).toBe(1);
  });

  it('пропущенный звонок: волонтёру приходит missed, и он снят с линии', async () => {
    jest.useFakeTimers({ now: 0, doNotFake: ['nextTick', 'queueMicrotask'] });
    ctx = await setup();
    const { matching, events, lastIncoming, connect } = ctx;

    await connect('volunteer');
    await matching.volunteerOnline('volunteer');
    await connect('blind');
    await matching.requestHelp('blind');
    const { requestId } = lastIncoming('socket-volunteer')!;

    await jest.advanceTimersByTimeAsync(21_000);

    expect(
      events('socket-volunteer', 'call:cancelled').at(-1)?.payload,
    ).toEqual({
      requestId,
      reason: 'missed',
    });
    expect(await matching.availableCount()).toBe(0);
    expect(events('socket-blind', 'call:waiting')).toHaveLength(1);
  });

  it('повторный call:request при живом запросе напоминает статус, но не создаёт второй', async () => {
    ctx = await setup();
    const { matching, events, connect } = ctx;

    await connect('volunteer');
    await matching.volunteerOnline('volunteer');
    await connect('blind');
    await matching.requestHelp('blind');
    await matching.requestHelp('blind');

    expect(events('socket-volunteer', 'call:incoming')).toHaveLength(1);
    expect(events('socket-blind', 'call:searching')).toHaveLength(2);
  });

  it('volunteer:online во время дозвона не даёт второго входящего', async () => {
    ctx = await setup();
    const { matching, events, connect } = ctx;

    await connect('volunteer');
    await matching.volunteerOnline('volunteer');
    await connect('b1');
    await matching.requestHelp('b1');
    await matching.volunteerOnline('volunteer');
    await connect('b2');
    await matching.requestHelp('b2');

    expect(events('socket-volunteer', 'call:incoming')).toHaveLength(1);
    expect(events('socket-b2', 'call:waiting')).toHaveLength(1);
  });
});
