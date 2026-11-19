import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';

import { useCallStore } from '@/features/calls';
import { useProfile } from '@/features/profile';
import { Spinner } from '@/shared/ui';

import { CallRoomStage } from './call-room-stage';

import './call-room-page.scss';

export const CallRoomPage = () => {
  const navigate = useNavigate();
  const match = useCallStore((s) => s.match);
  const previewRole = useCallStore((s) => s.previewRole);
  const { data: profile, isLoading } = useProfile();

  // Матч был при входе — значит, его обнулило завершение звонка, и уводит
  // CallRoomStage (волонтёра — на линию, незрячего — в «Помощь»). Раньше
  // здесь всех сразу кидало на /help: волонтёр на 1,6 секунды попадал
  // на чужой экран, пока не срабатывал переход на /volunteer.
  const hadMatchRef = useRef(match !== null);

  // Нет активного матча с самого начала (прямой переход/перезагрузка).
  useEffect(() => {
    if (match || hadMatchRef.current || isLoading) {
      return;
    }
    void navigate(profile?.role === 'volunteer' ? '/volunteer' : '/help', { replace: true });
  }, [match, isLoading, profile?.role, navigate]);

  if (!match || isLoading || !profile) {
    const ended = !match && hadMatchRef.current;
    return (
      <main id="main-content" className="call-room call-room--loading" tabIndex={-1}>
        {!ended && <Spinner className="call-room__spinner" />}
        <p role="status" aria-live="polite">
          {ended ? 'Звонок завершён' : 'Подключаемся к звонку…'}
        </p>
      </main>
    );
  }

  // В dev-превью роль можно форсировать (__previewCall('blind')), минуя профиль.
  const role = import.meta.env.DEV && previewRole ? previewRole : profile.role;

  return <CallRoomStage match={match} role={role} />;
};
