import { useState } from 'react';

import { useCallStore } from '@/features/calls';
import {
  APP_ERROR_MESSAGES,
  formatErrorCode,
  useAppErrorStore,
  type AppError,
} from '@/shared/lib/app-error';
import { checkConnection, useConnectivityStore } from '@/shared/lib/connectivity';
import { queryClient } from '@/shared/lib/tanstack-query';
import { ErrorScreen, Modal } from '@/shared/ui';

import { isInCallPhase } from './in-call';
import { reloadWhenOnline } from './reload-when-online';

import './error-overlay.scss';

/**
 * Экран ошибки поверх приложения: нет сети, сервер не отвечает, не
 * загрузились данные экрана, исключение вне рендера.
 *
 * Окном (Modal на нативном <dialog>), а не заменой дерева: приложение под ним
 * остаётся смонтированным — когда связь вернётся, человек продолжит с того же
 * места, с той же заполненной формой. Всё под окном inert, скринридер туда
 * не уйдёт. Закрыть окно жестом нельзя: за ним всё равно нерабочий экран.
 *
 * Во время звонка окно не показываем — см. in-call.ts.
 */
export const ErrorOverlay = () => {
  const connection = useConnectivityStore();
  const appError = useAppErrorStore((s) => s.current);
  const isInCall = useCallStore((s) => isInCallPhase(s.phase));
  const [isRecovering, setIsRecovering] = useState(false);

  if (isInCall) {
    return null;
  }

  const connectionError: AppError | null =
    connection.status === 'online'
      ? null
      : {
          kind: connection.status === 'offline' ? 'offline' : 'server-unreachable',
          code: connection.code ?? 'ERR_NETWORK',
        };

  // Связь важнее: без неё любая другая ошибка — следствие, а не причина.
  const shown = connectionError ?? appError?.error;
  if (!shown) {
    return null;
  }

  const retry = async () => {
    if (connectionError) {
      // Успех сам закроет окно и перезапросит данные (onConnectionRestored).
      await checkConnection();
      return;
    }
    if (appError?.recovery === 'reload') {
      await reloadWhenOnline();
      return;
    }
    setIsRecovering(true);
    useAppErrorStore.getState().dismiss();
    try {
      await queryClient.refetchQueries({ predicate: (q) => q.state.status === 'error' });
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <Modal aria-label="Ошибка" className="error-overlay">
      <ErrorScreen
        as="div"
        message={APP_ERROR_MESSAGES[shown.kind]}
        code={formatErrorCode(shown)}
        retrying={connection.checking || isRecovering}
        onRetry={() => void retry()}
      />
    </Modal>
  );
};
