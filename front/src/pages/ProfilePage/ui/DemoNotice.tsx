import { env } from '@/shared/config';
import { Notice } from '@/shared/ui/';

/** Приписка в профиле, только в сборке демо-стенда. */
export const DemoNotice = () =>
  env.isDemo ? (
    <Notice>Демо-версия ВИЖУ. Ваши данные будут удалены после окончания демонстрации.</Notice>
  ) : null;
