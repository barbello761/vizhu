import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useShallow } from 'zustand/shallow';

import { useCallStore, useVolunteerAvailability } from '@/features/calls';
import { useProfile } from '@/features/profile';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { Button, MovingGradient } from '@/shared/ui/v2';

import './CallWaitingPage.scss';

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const STATUS: Record<string, string> = {
  requesting: 'Соединяем…',
  searching: 'Волонтёр найден, дозваниваемся',
  waiting: 'Все волонтёры заняты. Вы в очереди',
  matched: 'Волонтёр на связи',
  idle: 'Соединяем…',
};

export const CallWaitingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [seconds, setSeconds] = useState(0);
  const { data: profile, isLoading } = useProfile();
  const { data: availability } = useVolunteerAvailability();
  const isVolunteer = profile?.role === 'volunteer';

  // ?contact=<имя> — звонок конкретному близкому. Ручки на бэке пока нет, экран
  // достижим только по прямой ссылке (в списке «Помощи» близкие отключены).
  const contactName = searchParams.get('contact');
  const isContactCall = contactName !== null && contactName !== '';

  const { phase, requestHelp } = useCallStore(
    useShallow((s) => ({ phase: s.phase, requestHelp: s.requestHelp })),
  );

  // Вызов волонтёра — действие незрячего. Волонтёра сюда не пускаем.
  useEffect(() => {
    if (!isLoading && isVolunteer) {
      void navigate('/volunteer', { replace: true });
    }
  }, [isLoading, isVolunteer, navigate]);

  // Поиск свободного волонтёра стартуем при входе; на выходе без матча — отменяем.
  // Для звонка близкому сокет не трогаем — это заглушка.
  useEffect(() => {
    if (isVolunteer || isContactCall) {
      return;
    }
    requestHelp();
    announceRouteChange('Ищем волонтёра. Пожалуйста, подождите.');

    return () => {
      const { phase: current, cancelRequest } = useCallStore.getState();
      if (current !== 'matched') {
        cancelRequest();
      }
    };
  }, [requestHelp, isVolunteer, isContactCall]);

  useEffect(() => {
    if (isContactCall) {
      announceRouteChange(`Звоним: ${contactName ?? ''}. Ожидаем ответа.`);
    }
  }, [isContactCall, contactName]);

  // Секундомер ожидания.
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Озвучиваем смену статуса незрячему.
  useEffect(() => {
    if (isContactCall) {
      return;
    }
    if (phase === 'searching') {
      announceRouteChange('Волонтёр найден, дозваниваемся.');
    }
    if (phase === 'waiting') {
      announceRouteChange('Все волонтёры заняты, вы в очереди.');
    }
  }, [phase, isContactCall]);

  const handleCancel = () => {
    if (!isContactCall) {
      useCallStore.getState().cancelRequest();
    }
    announceRouteChange('Вызов отменён.');
    void navigate('/help', { replace: true });
  };

  const title = isContactCall ? (contactName ?? '') : 'Поиск волонтёра';
  const statusText = isContactCall ? 'Ожидаем ответа…' : (STATUS[phase] ?? STATUS.requesting);
  const privacyText = isContactCall
    ? 'Как только контакт ответит — он увидит видео с задней камеры вашего телефона.'
    : 'Волонтёр увидит только видео с задней камеры вашего телефона. Ваше лицо, имя, номер телефона и местоположение ему не передаются.';

  return (
    <main id="main-content" className="call-search" tabIndex={-1} aria-label="Поиск волонтёра">
      <MovingGradient />

      <div className="call-search__body">
        <h1 className="call-search__title">{title}</h1>

        <div className="call-search__pending">
          {!isContactCall && (
            <p className="call-search__timer" aria-label={`Время ожидания ${formatTime(seconds)}`}>
              {formatTime(seconds)}
            </p>
          )}
          {!isContactCall && availability !== undefined && (
            <p className="call-search__count">
              {availability.available > 0
                ? `Доступных волонтёров: ${availability.available}`
                : 'Свободных волонтёров сейчас нет — ждём, пока кто-то освободится'}
            </p>
          )}
          <p className="call-search__status" role="status" aria-live="polite" aria-atomic="true">
            {statusText}
          </p>
        </div>

        <p className="call-search__privacy">{privacyText}</p>
      </div>

      <Button
        onAccent
        className="call-search__cancel"
        onClick={handleCancel}
        aria-label={isContactCall ? 'Отменить звонок' : 'Отменить вызов волонтёра'}
      >
        Отмена
      </Button>
    </main>
  );
};
