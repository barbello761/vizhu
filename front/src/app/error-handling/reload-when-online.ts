import { checkConnection } from '@/shared/lib/connectivity';

/**
 * «Попробовать снова» для поломок, после которых состояние не спасти, —
 * перезагрузка. Но только при живой связи: без неё web-версия без
 * сервис-воркера показала бы вместо приложения заглушку браузера «нет сети».
 * Неудачная проверка сама поднимет экран «нет соединения» поверх.
 */
export const reloadWhenOnline = async (): Promise<void> => {
  if (await checkConnection()) {
    window.location.reload();
  }
};
