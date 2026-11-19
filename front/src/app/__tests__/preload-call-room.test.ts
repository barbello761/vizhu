import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCallStore } from '@/features/calls';

import { preloadCallRoomOnCallStart } from '../router';

const loaded = vi.hoisted(() => vi.fn());

vi.mock('@/pages/call-room-page', () => {
  loaded();
  return { CallRoomPage: () => null };
});

describe('preloadCallRoomOnCallStart', () => {
  afterEach(() => useCallStore.setState({ phase: 'idle' }));

  it('пока звонка нет, экран звонка не качает, а с началом сценария — качает один раз', async () => {
    const unsubscribe = preloadCallRoomOnCallStart();
    expect(loaded).not.toHaveBeenCalled();

    useCallStore.setState({ phase: 'requesting' });
    useCallStore.setState({ phase: 'waiting' });
    await vi.dynamicImportSettled();

    expect(loaded).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
