import { useCallStore, type CallPhase } from '@/features/calls';

/**
 * Идёт разговор (или звонит входящий). В это время экран ошибки не показываем
 * и сбои не копим: у экрана звонка свой индикатор «Нестабильное соединение»,
 * LiveKit переподключается сам, а окно поверх оборвало бы разговор, который,
 * возможно, ещё идёт. Отказы медиа (микрофон, камера) там же и обрабатываются.
 */
export const isInCallPhase = (phase: CallPhase): boolean =>
  phase === 'matched' || phase === 'incoming';

export const isInCall = (): boolean => isInCallPhase(useCallStore.getState().phase);
