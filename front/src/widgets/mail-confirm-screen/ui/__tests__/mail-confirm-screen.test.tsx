import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/shared/api/mocks/server';
import { setAccessToken } from '@/shared/api/token-store';

import { MailConfirmScreen, type MailVerification } from '..';

const TICKET = {
  id: 'ticket-1',
  purpose: 'delete_account',
  email: 'me@example.com',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
};

/** Родитель держит тикет в своём стейте — как DeleteAccountPage. */
const Flow = ({ onConfirmed }: { onConfirmed: (id: string) => void }) => {
  const [verification, setVerification] = useState<MailVerification | null>(null);
  return (
    <MailConfirmScreen
      purpose="delete_account"
      lead="Нам нужно убедиться, что это вы."
      verification={verification}
      onVerificationChange={setVerification}
      onConfirmed={onConfirmed}
    />
  );
};

const renderFlow = (onConfirmed = vi.fn()) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Flow onConfirmed={onConfirmed} />
    </QueryClientProvider>,
  );

describe('MailConfirmScreen', () => {
  let sentLetters: number;

  beforeEach(() => {
    setAccessToken('token');
    sentLetters = 0;
    server.use(
      http.post('*/email/verifications', () => {
        sentLetters += 1;
        return HttpResponse.json({ ...TICKET, id: `new-${sentLetters}` }, { status: 201 });
      }),
    );
  });

  it('продолжает начатое подтверждение, а не шлёт письмо заново', async () => {
    const onConfirmed = vi.fn();
    server.use(
      http.get('*/email/verifications/active', () =>
        HttpResponse.json({ verification: { ...TICKET, status: 'confirmed' } }),
      ),
      http.get('*/email/verifications/:id', () =>
        HttpResponse.json({ ...TICKET, status: 'confirmed' }),
      ),
    );
    renderFlow(onConfirmed);

    // Переход по ссылке уже был — экран говорит об этом, не дожидаясь кнопки.
    expect(
      await screen.findByText(/Переход по ссылке из письма на me@example.com подтверждён/),
    ).toBeInTheDocument();
    expect(sentLetters).toBe(0);

    await userEvent.click(screen.getByRole('button', { name: 'Я перешёл по ссылке' }));
    await waitFor(() => expect(onConfirmed).toHaveBeenCalledWith('ticket-1'));
  });

  it('живого подтверждения нет — отправляет письмо', async () => {
    server.use(
      http.get('*/email/verifications/active', () => HttpResponse.json({ verification: null })),
      http.get('*/email/verifications/:id', () =>
        HttpResponse.json({ ...TICKET, status: 'pending' }),
      ),
    );
    renderFlow();

    expect(await screen.findByText(/Мы отправили письмо на me@example.com/)).toBeInTheDocument();
    expect(sentLetters).toBe(1);
  });
});
