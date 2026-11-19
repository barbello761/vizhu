import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCallStore } from '@/features/calls';
import { useAppErrorStore } from '@/shared/lib/app-error';
import { useConnectivityStore } from '@/shared/lib/connectivity';
import type * as Connectivity from '@/shared/lib/connectivity';
import { queryClient } from '@/shared/lib/tanstack-query';

import { ErrorOverlay } from '../error-overlay';

const checkConnection = vi.fn();
vi.mock('@/shared/lib/connectivity', async (importOriginal) => ({
  ...(await importOriginal<typeof Connectivity>()),
  checkConnection: () => checkConnection(),
}));

describe('ErrorOverlay', () => {
  beforeEach(() => {
    checkConnection.mockReset().mockResolvedValue(false);
    useConnectivityStore.setState({ status: 'online', code: null, checking: false });
    useAppErrorStore.setState({ current: null });
    useCallStore.setState({ phase: 'idle' });
  });

  it('всё в порядке — окна нет', () => {
    render(<ErrorOverlay />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('сервер не отвечает — текст макета и код пинга', () => {
    useConnectivityStore.setState({ status: 'server-down', code: 'TIMEOUT' });
    render(<ErrorOverlay />);

    expect(screen.getByRole('dialog', { name: 'Ошибка' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Отсутствует соединение с сервером. Проверьте своё подключение и попробуйте снова.(Код ошибки: TIMEOUT)',
    );
  });

  it('нет сети — отдельный текст про интернет', () => {
    useConnectivityStore.setState({ status: 'offline', code: 'OFFLINE' });
    render(<ErrorOverlay />);

    expect(screen.getByRole('alert')).toHaveTextContent('Нет подключения к интернету');
  });

  it('при обрыве «Попробовать снова» перепроверяет связь', async () => {
    const user = userEvent.setup();
    useConnectivityStore.setState({ status: 'server-down', code: 'ERR_NETWORK' });
    render(<ErrorOverlay />);

    await user.click(screen.getByRole('button', { name: 'Попробовать снова' }));
    expect(checkConnection).toHaveBeenCalledTimes(1);
  });

  it('связь важнее ошибки данных: показываем причину, а не следствие', () => {
    useConnectivityStore.setState({ status: 'server-down', code: '502' });
    useAppErrorStore.getState().report({ kind: 'server', code: '500' }, 'refetch');
    render(<ErrorOverlay />);

    expect(screen.getByRole('alert')).toHaveTextContent('(Код ошибки: 502)');
  });

  it('упал запрос данных — повтор перезапрашивает упавшее и закрывает окно', async () => {
    const user = userEvent.setup();
    const refetch = vi.spyOn(queryClient, 'refetchQueries').mockResolvedValue();
    useAppErrorStore.getState().report({ kind: 'server', code: '500' }, 'refetch');
    render(<ErrorOverlay />);

    await user.click(screen.getByRole('button', { name: 'Попробовать снова' }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('во время звонка не перекрывает разговор', () => {
    useConnectivityStore.setState({ status: 'server-down', code: 'ERR_NETWORK' });
    useCallStore.setState({ phase: 'matched' });
    render(<ErrorOverlay />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
