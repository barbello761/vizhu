import { describe, expect, it } from '@jest/globals';
import { callIdFromRoom, roomForCall } from './call-room';

describe('call room naming', () => {
  const id = '3f1c2a9e-8b7d-4c6e-9a5f-1b2c3d4e5f60';

  it('round-trips a call id through the room name', () => {
    expect(callIdFromRoom(roomForCall(id))).toBe(id);
  });

  it('ignores rooms that are not calls', () => {
    expect(callIdFromRoom('test-room')).toBeUndefined();
    expect(callIdFromRoom('call_not-a-uuid')).toBeUndefined();
  });
});
