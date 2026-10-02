import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { useCallStore } from '@/features/calls';
import { useProfile } from '@/features/profile';
import { Spinner } from '@/shared/ui/';

import { CallRoomStage } from './CallRoomStage';

import './CallRoomPage.scss';

export const CallRoomPage = () => {
  const navigate = useNavigate();
  const match = useCallStore((s) => s.match);
  const { data: profile, isLoading } = useProfile();

  // Нет активного матча (прямой переход/перезагрузка) — на экран помощи.
  useEffect(() => {
    if (!match) {
      void navigate('/help', { replace: true });
    }
  }, [match, navigate]);

  if (!match || isLoading || !profile) {
    return (
      <main id="main-content" className="call-room call-room--loading" tabIndex={-1}>
        <Spinner className="call-room__spinner" />
        <p role="status" aria-live="polite">
          Подключаемся к звонку…
        </p>
      </main>
    );
  }

  return <CallRoomStage match={match} role={profile.role} />;
};
