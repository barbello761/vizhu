import { type ReactNode, useId } from 'react';

import './hero-screen.scss';

interface HeroScreenProps {
  /** Название экрана для скринридера — визуально скрытый заголовок. */
  title: string;
  /** Содержимое по центру: логотип, текст, основная кнопка. */
  children: ReactNode;
  /** Необязательная стопка, прижатая к низу экрана. */
  actions?: ReactNode;
}

export const HeroScreen = ({ title, children, actions }: HeroScreenProps) => {
  const titleId = useId();

  return (
    <main id="main-content" className="hero-screen" tabIndex={-1} aria-labelledby={titleId}>
      <h1 className="visually-hidden" id={titleId}>
        {title}
      </h1>

      <div className="hero-screen__center">
        <div className="hero-screen__content">{children}</div>
      </div>

      {actions && <div className="hero-screen__actions">{actions}</div>}
    </main>
  );
};
