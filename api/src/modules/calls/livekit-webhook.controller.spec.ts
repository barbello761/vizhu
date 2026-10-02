import { describe, expect, it, jest } from '@jest/globals';
import { createHash } from 'crypto';
import { AccessToken } from 'livekit-server-sdk';
import { CallsService } from './calls.service';
import { LivekitWebhookController } from './livekit-webhook.controller';

jest.mock('./call-records.service', () => ({ CallRecordsService: class {} }));

const API_KEY = 'test-key';
const API_SECRET = 'test-secret-that-is-long-enough-for-hs256';
const CALL_ID = '3f1c2a9e-8b7d-4c6e-9a5f-1b2c3d4e5f60';

const config = {
  getOrThrow: (name: string) =>
    ({
      LIVEKIT_API_KEY: API_KEY,
      LIVEKIT_API_SECRET: API_SECRET,
      LIVEKIT_URL: 'wss://rtc',
      LIVEKIT_HOST: 'http://livekit:7880',
    })[name],
};

/** Подписывает тело так же, как это делает LiveKit-сервер. */
const sign = async (body: string, secret = API_SECRET): Promise<string> => {
  const token = new AccessToken(API_KEY, secret);
  token.sha256 = createHash('sha256').update(body).digest('base64');
  return token.toJwt();
};

const setup = () => {
  const records = {
    participantJoined: jest
      .fn<(...args: string[]) => Promise<void>>()
      .mockResolvedValue(),
    participantLeft: jest
      .fn<(...args: string[]) => Promise<void>>()
      .mockResolvedValue(),
    finish: jest.fn<(...args: string[]) => Promise<void>>().mockResolvedValue(),
  };
  const controller = new LivekitWebhookController(
    new CallsService(config as never),
    records as never,
  );
  return { controller, records };
};

describe('LivekitWebhookController', () => {
  it('dispatches signed events of call rooms', async () => {
    const { controller, records } = setup();

    const left = JSON.stringify({
      event: 'participant_left',
      room: { name: `call_${CALL_ID}` },
      participant: { identity: 'user-1' },
    });
    await controller.receive(left, await sign(left));
    expect(records.participantLeft).toHaveBeenCalledWith(CALL_ID, 'user-1');

    const finished = JSON.stringify({
      event: 'room_finished',
      room: { name: `call_${CALL_ID}` },
    });
    await controller.receive(finished, await sign(finished));
    expect(records.finish).toHaveBeenCalledWith(CALL_ID);
  });

  it('rejects a forged signature', async () => {
    const { controller, records } = setup();
    const body = JSON.stringify({
      event: 'room_finished',
      room: { name: `call_${CALL_ID}` },
    });

    await expect(
      controller.receive(
        body,
        await sign(body, 'another-secret-that-is-long-enough'),
      ),
    ).rejects.toThrow('Неверная подпись вебхука');
    expect(records.finish).not.toHaveBeenCalled();
  });

  it('ignores rooms that are not calls', async () => {
    const { controller, records } = setup();
    const body = JSON.stringify({
      event: 'room_finished',
      room: { name: 'test-room' },
    });

    await controller.receive(body, await sign(body));
    expect(records.finish).not.toHaveBeenCalled();
  });
});
