import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { VoiceRecordOverlay } from '..';

const cancel = vi.fn();

// Микрофона в jsdom нет — запись подменяем, проверяем только поведение окна.
vi.mock('@/shared/lib/use-voice-record', () => ({
  useVoiceRecord: () => ({
    status: 'recording',
    audioBlob: null,
    analyserNode: null,
    error: null,
    start: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
    cancel,
  }),
}));

vi.mock('../waveform', () => ({ Waveform: () => null }));

describe('VoiceRecordOverlay', () => {
  it('модальное окно с фокусом на доступной кнопке отмены', () => {
    render(<VoiceRecordOverlay onClose={vi.fn()} onSend={vi.fn()} isSending={false} />);

    expect(screen.getByRole('dialog', { name: 'Запись голоса' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Отменить запись' })).toHaveFocus();
  });

  it('кнопка отмены останавливает запись и закрывает окно', async () => {
    const onClose = vi.fn();
    render(<VoiceRecordOverlay onClose={onClose} onSend={vi.fn()} isSending={false} />);

    await userEvent.click(screen.getByRole('button', { name: 'Отменить запись' }));

    expect(cancel).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('во время отправки отмена недоступна, но кнопка не исчезает для скринридера', async () => {
    const onClose = vi.fn();
    render(<VoiceRecordOverlay onClose={onClose} onSend={vi.fn()} isSending />);

    const button = screen.getByRole('button', { name: 'Отменить запись' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toBeEnabled();

    await userEvent.click(button);
    await userEvent.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });
});
