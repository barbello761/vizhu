import axios from 'axios';

import { api } from '@/shared/api';
import {
  isBenignError,
  isConnectionError,
  toAppError,
  useAppErrorStore,
} from '@/shared/lib/app-error';
import { onConnectionRestored, reportConnectionFailure } from '@/shared/lib/connectivity';
import { queryClient } from '@/shared/lib/tanstack-query';

import { isInCall } from './in-call';

/** Ответа нет вовсе или его вернул прокси вместо лежащего API. */
const isConnectionFailure = (error: unknown): boolean =>
  axios.isAxiosError(error) &&
  !axios.isCancel(error) &&
  (error.response === undefined || [502, 503, 504].includes(error.response.status));

/**
 * Необработанное исключение вне рендера: обработчик события, таймер, промис
 * без catch. Границы ошибок React их не видят. Связь — на проверку связи,
 * остальное — экран ошибки с перезагрузкой: состояние после такого падения
 * уже ненадёжно.
 */
const handleUncaught = (error: unknown) => {
  if (isBenignError(error)) {
    return;
  }
  // Иначе сбой медиа посреди разговора всплыл бы экраном ошибки сразу после
  // него — когда уже ничего не сломано.
  if (isInCall()) {
    console.warn('[app] Ошибка во время звонка', error);
    return;
  }
  const appError = toAppError(error);
  if (isConnectionError(appError)) {
    reportConnectionFailure();
    return;
  }
  console.error('[app] Необработанная ошибка', error);
  useAppErrorStore.getState().report(appError, 'reload');
};

/**
 * Запрос данных упал окончательно (react-query уже отработал свои повторы).
 *
 * Экран ошибки — только если показывать нечего: данных в кэше нет. Иначе
 * человек видит прежние данные, а не «не указано» на каждом поле — именно так
 * раньше выглядел профиль при лежащем сервере. 4xx не трогаем: их разбирают
 * сами экраны (404 профиля — регистрация, 409 — «уже занято» и т.п.).
 * Мутации тоже не трогаем — у форм свои сообщения рядом с кнопкой.
 */
const handleQueryError = (error: unknown, hasData: boolean) => {
  if (hasData || isBenignError(error)) {
    return;
  }
  const appError = toAppError(error);
  if (isConnectionError(appError)) {
    reportConnectionFailure();
    return;
  }
  if (appError.kind === 'server' || !axios.isAxiosError(error)) {
    useAppErrorStore.getState().report(appError, 'refetch');
  }
};

/**
 * Подключить глобальный перехват ошибок. Зовётся один раз до первого
 * рендера, чтобы ловить и то, что падает на старте. Возвращает отписку.
 */
export const installGlobalErrorHandlers = (): (() => void) => {
  const onError = (event: ErrorEvent) => handleUncaught(event.error ?? event.message);
  const onRejection = (event: PromiseRejectionEvent) => handleUncaught(event.reason);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  // Любой упавший без ответа запрос — повод проверить связь, даже если экран
  // свою ошибку обработал сам (форма показала «не удалось сохранить»): если
  // сервер лежит, человеку важнее узнать это, чем повторять кнопку.
  const interceptor = api.interceptors.response.use(undefined, (error: unknown) => {
    if (isConnectionFailure(error)) {
      reportConnectionFailure();
    }
    return Promise.reject(error);
  });

  const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'error') {
      handleQueryError(event.action.error, event.query.state.data !== undefined);
    }
  });

  // Связь вернулась — всё, что не догрузилось, перезапрашиваем, а пустые
  // из-за обрыва экраны заполняются сами, без перезагрузки.
  const unsubscribeRestore = onConnectionRestored(() => {
    void queryClient.invalidateQueries();
  });

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    api.interceptors.response.eject(interceptor);
    unsubscribeQueries();
    unsubscribeRestore();
  };
};
