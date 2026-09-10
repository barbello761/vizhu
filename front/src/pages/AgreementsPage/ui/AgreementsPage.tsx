import { useState } from 'react';
import { useNavigate } from 'react-router';

import { announceRouteChange } from '@/shared/lib/a11y';
import { Button, Checkbox } from '@/shared/ui/v2';
import { FormScreen } from '@/widgets/FormScreen';

import './AgreementsPage.scss';

const INCOMPLETE_MESSAGE = 'Отметьте оба согласия, чтобы продолжить';

export const AgreementsPage = () => {
  const navigate = useNavigate();
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    if (!acceptedPrivacy || !acceptedTerms) {
      setError(INCOMPLETE_MESSAGE);
      announceRouteChange(INCOMPLETE_MESSAGE);
      return;
    }
    void navigate('/registration/name');
  };

  return (
    <FormScreen
      title="Нужно ваше согласие"
      onBack={() => void navigate(-1)}
      actions={
        <div className="agreements__consent">
          <Checkbox
            checked={acceptedPrivacy}
            onChange={(event) => {
              setAcceptedPrivacy(event.target.checked);
              setError(null);
            }}
          >
            Согласен с{' '}
            <span className="agreements__document">Политикой обработки персональных данных</span>
          </Checkbox>

          <Checkbox
            checked={acceptedTerms}
            onChange={(event) => {
              setAcceptedTerms(event.target.checked);
              setError(null);
            }}
          >
            Согласен с <span className="agreements__document">Пользовательским соглашением</span>
          </Checkbox>

          {error && (
            <p className="agreements__error" role="alert">
              {error}
            </p>
          )}

          <Button onClick={handleContinue}>Продолжить</Button>
        </div>
      }
    >
      <p className="agreements__text">
        ВИЖУ обрабатывает ваши данные. Это нужно для работы сервиса и безопасности звонков.
      </p>

      <p className="agreements__text">
        Продолжая пользоваться ВИЖУ, вы соглашаетесь не использовать приложение во время ходьбы —
        это может быть небезопасно.
      </p>
    </FormScreen>
  );
};
