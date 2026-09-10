import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { INVITE_URL } from '../../model/invite';
import { InvitingPage } from '../InvitingPage';

const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

const setClipboard = (writeText: () => Promise<void>) => {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
};

const setShare = (share: ((data: ShareData) => Promise<void>) | undefined) => {
  Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <InvitingPage />
    </MemoryRouter>,
  );

describe('InvitingPage', () => {
  afterEach(() => {
    if (clipboardDescriptor) {
      Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
    }
    setShare(undefined);
    vi.restoreAllMocks();
  });

  it('«Копировать» кладёт ссылку-приглашение в буфер обмена', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText); // после setup(), иначе userEvent подменит clipboard
    renderPage();

    await user.click(screen.getByRole('button', { name: /Скопировать ссылку/ }));
    expect(writeText).toHaveBeenCalledWith(INVITE_URL);
  });

  it('«Поделиться ссылкой» вызывает Web Share API, когда он доступен', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    setShare(share);
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Поделиться ссылкой' }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: INVITE_URL }));
  });

  it('без Web Share API «Поделиться» откатывается на копирование', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    setShare(undefined);
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Поделиться ссылкой' }));
    expect(writeText).toHaveBeenCalledWith(INVITE_URL);
  });
});
