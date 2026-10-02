import { type ReactNode, useId } from 'react';

import { BackButton } from '@/shared/ui/BackButton';
import './form-screen.scss';

interface FormScreenProps {
  /** Заголовок. Переносы строк из макета передаются как `\n`. */
  title: string;
  description?: ReactNode;
  /** Кнопка «назад» рендерится только если передан обработчик. */
  onBack?: () => void;
  /*aria для кнопки "назад"*/
  backLabel?: string;
  /** Сдвигает контент вниз на место кнопки «назад» — для экранов, с которых нельзя вернуться. */
  insetTop?: boolean;
  /** Поля формы — идут в одной колонке с заголовком, как в макете. */
  children: ReactNode;
  /** Стопка кнопок, прижатая к низу экрана. */
  actions: ReactNode;
}

export const FormScreen = ({
  title,
  description,
  onBack,
  backLabel,
  insetTop = false,
  children,
  actions,
}: FormScreenProps) => {
  const titleId = useId();
  const cls = ['form-screen', insetTop && 'form-screen--inset-top'].filter(Boolean).join(' ');

  return (
    <main id="main-content" className={cls} tabIndex={-1} aria-labelledby={titleId}>
      <div className="form-screen__top">
        {onBack && <BackButton onClick={onBack} arialabel={backLabel} />}

        <div className="form-screen__head">
          <h1 className="form-screen__title" id={titleId}>
            {title}
          </h1>
          {description && <p className="form-screen__description">{description}</p>}
          {children}
        </div>
      </div>

      <div className="form-screen__actions">{actions}</div>
    </main>
  );
};
