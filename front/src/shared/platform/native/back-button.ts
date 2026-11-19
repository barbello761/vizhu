import { App } from '@capacitor/app';

import type { BackButtonPort } from '../types';

/**
 * Системная «назад» Android через @capacitor/app. Пока подписка жива, плагин
 * не выполняет действие по умолчанию (шаг назад по истории WebView / выход
 * из приложения) — его заменяет обработчик.
 *
 * addListener асинхронный: отписка, вызванная раньше, чем он зарезолвился,
 * снимает слушатель сразу по готовности.
 */
export const nativeBackButton: BackButtonPort = {
  subscribe: (handler) => {
    let removed = false;
    const listener = App.addListener('backButton', handler);
    return () => {
      if (removed) {
        return;
      }
      removed = true;
      void listener.then((handle) => handle.remove());
    };
  },
};
