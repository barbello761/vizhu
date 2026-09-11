import { useEffect } from 'react';

import { announceRouteChange } from '@/shared/lib/a11y';
import { useGoBack } from '@/shared/lib/navigation';
import { ActionLink, Button, ChevronBackIcon, Logo } from '@/shared/ui/v2';

import { APP_RELEASE, APP_VERSION, SUPPORT_TELEGRAM_URL } from '../model/about';

import './AboutPage.scss';

const SOON = (what: string) => `${what} появится в одном из следующих обновлений`;

export const AboutPage = () => {
  const goBack = useGoBack('/profile');

  useEffect(() => {
    announceRouteChange(`О приложении ВИЖУ. Версия ${APP_VERSION}.`);
  }, []);

  return (
    <main id="main-content" className="about" tabIndex={-1} aria-labelledby="about-title">
      <div className="about__top">
        <Button variant="icon" aria-label="Назад" onClick={goBack}>
          <ChevronBackIcon />
        </Button>
      </div>

      <div className="about__content">
        <Logo className="about__logo" label={null} />
        <h1 id="about-title" className="visually-hidden">
          О приложении ВИЖУ
        </h1>
        <p className="about__version">
          Версия {APP_VERSION} ({APP_RELEASE})
        </p>

        <div className="about__links">
          <ActionLink href={SUPPORT_TELEGRAM_URL} variant="tertiary">
            Связаться с нами
          </ActionLink>
          <Button
            variant="tertiary"
            onClick={() => announceRouteChange(SOON('Политика конфиденциальности'))}
          >
            Политика конфиденциальности
          </Button>
          <Button
            variant="tertiary"
            onClick={() => announceRouteChange(SOON('Пользовательское соглашение'))}
          >
            Пользовательское соглашение
          </Button>
        </div>
      </div>

      <div className="about__actions">
        <Button onClick={() => announceRouteChange(SOON('Оценка приложения'))}>
          Оценить приложение
        </Button>
      </div>
    </main>
  );
};
