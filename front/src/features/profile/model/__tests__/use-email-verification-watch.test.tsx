import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/features/auth';
import { server } from '@/shared/api/mocks/server';
import { setAccessToken } from '@/shared/api/token-store';

import { useEmailVerificationWatch } from '../use-email-verification-watch';

const profile = (emailVerified: boolean) => ({
  uuid: 'u',
  name: 'Иван',
  role: 'blind',
  phone: '79990001122',
  email: 'me@example.com',
  emailVerified,
  isVerified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const Status = () => {
  const { data } = useEmailVerificationWatch();
  return <p>{data ? (data.emailVerified ? 'подтверждена' : 'не подтверждена') : '…'}</p>;
};

describe('useEmailVerificationWatch', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setAccessToken('token');
    useAuthStore.setState({ isAuthed: true, isRegistered: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('снимает «не подтверждена», как только переход по ссылке дошёл до бэкенда', async () => {
    let verified = false;
    let requests = 0;
    server.use(
      http.get('*/profile', () => {
        requests += 1;
        return HttpResponse.json(profile(verified));
      }),
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Status />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('не подтверждена')).toBeInTheDocument();

    verified = true; // человек нажал ссылку в почте
    await vi.advanceTimersByTimeAsync(5000);
    expect(await screen.findByText('подтверждена')).toBeInTheDocument();

    // Подтверждена — опрос выключился.
    const afterVerified = requests;
    await vi.advanceTimersByTimeAsync(15_000);
    expect(requests).toBe(afterVerified);
  });
});
