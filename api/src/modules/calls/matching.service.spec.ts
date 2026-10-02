import { describe, expect, it, jest } from '@jest/globals';
import { InMemoryMatchingStore } from './in-memory-matching.store';
import { MatchingService } from './matching.service';

// Настоящий сервис тянет TypeORM-сущности (и ESM-пакет uuid, который jest
// не разбирает); здесь он всё равно подменяется заглушкой ниже.
jest.mock('./call-records.service', () => ({ CallRecordsService: class {} }));

describe('MatchingService', () => {
  it('matches a blind user and a volunteer without changing socket events', async () => {
    const emitted: Array<{
      socketId: string;
      event: string;
      payload: unknown;
    }> = [];
    const server = {
      to: (socketId: string) => ({
        emit: (event: string, payload: unknown) =>
          emitted.push({ socketId, event, payload }),
      }),
    };
    const calls = {
      ensureRoom: jest
        .fn<(...args: string[]) => Promise<void>>()
        .mockResolvedValue(undefined),
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
    const records = {
      open: jest
        .fn<(...args: string[]) => Promise<void>>()
        .mockResolvedValue(undefined),
      ringStarted: jest
        .fn<(...args: string[]) => Promise<void>>()
        .mockResolvedValue(undefined),
      accepted: jest
        .fn<(...args: string[]) => Promise<void>>()
        .mockResolvedValue(undefined),
      cancelSearchesOf: jest
        .fn<() => Promise<void>>()
        .mockResolvedValue(undefined),
    };
    const matching = new MatchingService(
      calls as never,
      new InMemoryMatchingStore(),
      records as never,
    );
    matching.bindServer(server as never);
    await matching.onModuleInit();

    await matching.userConnected('volunteer', 'socket-volunteer');
    await matching.volunteerOnline('volunteer');
    await matching.userConnected('blind', 'socket-blind');
    await matching.requestHelp('blind');

    const incoming = emitted.find(
      (item) =>
        item.socketId === 'socket-volunteer' && item.event === 'call:incoming',
    );
    expect(incoming?.payload).toMatchObject({ blindUserId: 'blind' });

    await matching.accept(
      (incoming?.payload as { requestId: string }).requestId,
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

    const { requestId } = incoming?.payload as { requestId: string };
    expect(records.open).toHaveBeenCalledWith(requestId, 'blind');
    expect(records.ringStarted).toHaveBeenCalledWith(requestId);
    expect(records.accepted).toHaveBeenCalledWith(requestId, 'volunteer');
    for (const match of matches) {
      expect(match.payload).toMatchObject({
        callId: requestId,
        room: `call_${requestId}`,
      });
    }
    await matching.onModuleDestroy();
  });

  it('keeps matching when the call history cannot be written', async () => {
    const emitted: string[] = [];
    const server = {
      to: () => ({ emit: (event: string) => emitted.push(event) }),
    };
    const calls = {
      ensureRoom: jest
        .fn<(...args: string[]) => Promise<void>>()
        .mockResolvedValue(undefined),
      createToken: jest
        .fn<() => Promise<{ url: string; room: string; token: string }>>()
        .mockResolvedValue({ url: 'wss://x', room: 'r', token: 't' }),
    };
    const failing = jest
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error('db is down'));
    const records = {
      open: failing,
      ringStarted: failing,
      accepted: failing,
      cancelSearchesOf: failing,
    };
    const matching = new MatchingService(
      calls as never,
      new InMemoryMatchingStore(),
      records as never,
    );
    matching.bindServer(server as never);
    await matching.onModuleInit();

    await matching.userConnected('volunteer', 'socket-volunteer');
    await matching.volunteerOnline('volunteer');
    await matching.userConnected('blind', 'socket-blind');
    await matching.requestHelp('blind');

    expect(emitted).toContain('call:incoming');
    await matching.onModuleDestroy();
  });
});
