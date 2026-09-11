import { useEffect, useId } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';

import { primeAudio, useCallStore } from '@/features/calls';
import { useProfile } from '@/features/profile';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { platform } from '@/shared/platform';
import { Notice } from '@/shared/ui/v2';

import { OnlineToggle } from './OnlineToggle';

import './VolunteerPage.scss';

const IN_DEVELOPMENT = 'Функционал в разработке';

export const VolunteerPage = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();
  const statsTitleId = useId();
  const contactsTitleId = useId();

  const { intent, phase, goOnline, goOffline } = useCallStore(
    useShallow((s) => ({
      intent: s.intent,
      phase: s.phase,
      goOnline: s.goOnline,
      goOffline: s.goOffline,
    })),
  );

  const isOnline = intent === 'volunteer';

  // Гейт: кабинет только для волонтёров.
  useEffect(() => {
    if (!isLoading && profile && profile.role !== 'volunteer') {
      void navigate('/', { replace: true });
    }
  }, [isLoading, profile, navigate]);

  useEffect(() => {
    announceRouteChange('Кабинет волонтёра. Встаньте на линию, чтобы принимать звонки.');
  }, []);

  const handleToggle = () => {
    if (isOnline) {
      goOffline();
      toast.info('Вы ушли с линии');
      announceRouteChange('Вы ушли с линии. Звонки больше не поступают.');
    } else {
      // Жест пользователя: разблокируем аудио, чтобы рингтон входящего звучал,
      // и здесь же просим разрешение на уведомления — на регистрации тумблер
      // по умолчанию выключен, а без разрешения волонтёр со свёрнутым окном
      // о звонке не узнает.
      primeAudio();
      void platform.permissions.request('notifications');
      goOnline();
      toast.success('Вы на линии — ждём звонки');
      announceRouteChange('Вы на линии. Ждём входящие звонки.');
    }
  };

  const statusHeading = isOnline
    ? phase === 'incoming'
      ? 'Входящий звонок…'
      : 'Вы на линии'
    : 'Не на линии';

  const statusHint = isOnline
    ? 'Звонок придёт автоматически — не закрывайте приложение'
    : 'Нажмите на иконку выше, чтобы начать принимать звонки';

  return (
    <div className="volunteer">
      <h1 className="visually-hidden">Кабинет волонтёра</h1>

      <section className="volunteer__line" aria-labelledby="volunteer-status-heading">
        <OnlineToggle online={isOnline} onToggle={handleToggle} />

        <div className="volunteer__status" role="status" aria-live="polite">
          <h2
            id="volunteer-status-heading"
            className={[
              'volunteer__status-heading',
              isOnline && 'volunteer__status-heading--online',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {statusHeading}
          </h2>
          <p className="volunteer__status-hint">{statusHint}</p>
        </div>
      </section>

      <section className="volunteer__stats" aria-labelledby={statsTitleId}>
        <h2 id={statsTitleId} className="volunteer__section-title">
          Статистика за сегодня
        </h2>
        <Notice>{IN_DEVELOPMENT}</Notice>
      </section>

      <section className="volunteer__contacts" aria-labelledby={contactsTitleId}>
        <h2 id={contactsTitleId} className="volunteer__section-title">
          Близкие люди
        </h2>
        <Notice>{IN_DEVELOPMENT}</Notice>
      </section>
    </div>
  );
};
