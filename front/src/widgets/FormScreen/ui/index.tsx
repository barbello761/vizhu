import { type ReactNode, useId } from 'react';

import { Button, ChevronBackIcon } from '@/shared/ui/v2';

import './form-screen.scss';

interface FormScreenProps {
  title: string;
  description?: ReactNode;
  /** Кнопка «назад» рендерится только если передан обработчик. */
  onBack?: () => void;
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
  backLabel = 'Назад',
  insetTop = false,
  children,
  actions,
}: FormScreenProps) => {
  const titleId = useId();
  const cls = ['form-screen', insetTop && 'form-screen--inset-top'].filter(Boolean).join(' ');

  return (
    <main id="main-content" className={cls} tabIndex={-1} aria-labelledby={titleId}>
      <div className="form-screen__top">
        {onBack && (
          <Button variant="icon" aria-label={backLabel} onClick={onBack}>
            <ChevronBackIcon />
          </Button>
        )}

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
