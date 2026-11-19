import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { IncomingCallOverlay } from '../incoming-call-overlay';

const accept = vi.fn();
const decline = vi.fn();

vi.mock('@/features/calls', () => ({
  startRinging: vi.fn(),
  stopRinging: vi.fn(),
  useCallStore: (select: (s: { accept: typeof accept; decline: typeof decline }) => unknown) =>
    select({ accept, decline }),
}));

describe('IncomingCallOverlay', () => {
  it('модальный диалог с заголовком и описанием, фокус на «Принять»', () => {
    render(<IncomingCallOverlay requestId="req-1" />);

    const dialog = screen.getByRole('dialog', { name: 'Входящий вызов' });
    expect(dialog).toHaveAccessibleDescription(/Разговор идёт голосом/);
    expect(screen.getByRole('button', { name: 'Принять звонок' })).toHaveFocus();
  });

  it('Escape не закрывает и не отклоняет звонок — только явный выбор', async () => {
    render(<IncomingCallOverlay requestId="req-1" />);

    await userEvent.keyboard('{Escape}');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(decline).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Отклонить звонок' }));
    expect(decline).toHaveBeenCalledWith('req-1');
  });

  it('после «Принять» кнопки блокируются, повторного accept нет', async () => {
    accept.mockClear();
    render(<IncomingCallOverlay requestId="req-2" />);

    await userEvent.click(screen.getByRole('button', { name: 'Принять звонок' }));
    await userEvent.click(screen.getByRole('button', { name: 'Соединяем со звонком' }));

    expect(accept).toHaveBeenCalledTimes(1);
    expect(accept).toHaveBeenCalledWith('req-2');
    expect(screen.getByRole('button', { name: 'Отклонить звонок' })).toBeDisabled();
  });
});
