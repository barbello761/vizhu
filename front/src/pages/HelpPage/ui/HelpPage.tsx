import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { useProfile } from '@/features/profile';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { ActionLink, HeadsetIcon, Tile } from '@/shared/ui/v2';

import './HelpPage.scss';

export const HelpPage = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();

  // «Помощь» — экран незрячего. Волонтёру здесь делать нечего → в кабинет.
  useEffect(() => {
    if (!isLoading && profile?.role === 'volunteer') {
      void navigate('/volunteer', { replace: true });
    }
  }, [isLoading, profile, navigate]);

  useEffect(() => {
    announceRouteChange('Помощь. Кнопка звонка волонтёру и приглашение близкого.');
  }, []);

  return (
    <div className="help">
      <section className="help__hero" aria-labelledby="help-volunteer-title">
        <h2 id="help-volunteer-title" className="visually-hidden">
          Звонок волонтёру
        </h2>
        <Tile
          to="/call/waiting"
          icon={<HeadsetIcon />}
          label={'Звонок\nволонтёру'}
          ariaLabel="Позвонить волонтёру. Живой помощник ответит голосом за несколько секунд"
        />
      </section>

      <ActionLink to="/inviting" variant="tertiary" className="help__invite">
        Пригласить близкого
      </ActionLink>
    </div>
  );
};
