import type { BackButtonPort } from '../types';

/**
 * В браузере системная «назад» сама приходит в открытый `<dialog>` событием
 * `cancel` (CloseWatcher), а без открытого окна должна листать историю —
 * перехватывать нечего.
 */
export const webBackButton: BackButtonPort = {
  subscribe: () => () => {},
};
