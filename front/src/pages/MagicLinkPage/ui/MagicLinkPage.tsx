import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { type EmailPurpose, emailVerificationApi } from '@/features/email-verification';
import { apiErrorMessage } from '@/shared/api';
import { announceRouteChange } from '@/shared/lib/a11y';
import { Spinner } from '@/shared/ui/v2';
import { ResultScreen } from '@/widgets/ResultScreen';

import './MagicLinkPage.scss';

const GENERIC_ERROR = 'Не удалось подтвердить ссылку. Попробуйте открыть письмо ещё раз.';
const NO_TOKEN_ERROR = 'В ссылке нет кода подтверждения. Откройте её из письма целиком.';

const RESULT_COPY: Record<EmailPurpose, { title: string; description: string }> = {
  verify_email: {
    title: 'Электронная почта\nподтверждена',
    description:
      'Теперь это резервный способ входа — он пригодится, если вы потеряете доступ к номеру телефона. Эту страницу можно закрыть.',
  },
  change_email: {
    title: 'Почта\nподтверждена',
    description:
      'Вернитесь в приложение ВИЖУ и нажмите «Я перешёл по ссылке», чтобы сохранить новый адрес. Эту страницу можно закрыть.',
  },
  change_phone: {
    title: 'Смена номера\nподтверждена',
    description:
      'Вернитесь в приложение ВИЖУ и нажмите «Я перешёл по ссылке», чтобы продолжить смену номера. Эту страницу можно закрыть.',
  },
  delete_account: {
    title: 'Удаление\nподтверждено',
    description:
      'Вернитесь в приложение ВИЖУ и нажмите «Я перешёл по ссылке», чтобы завершить удаление аккаунта. Эту страницу можно закрыть.',
  },
};

type State =
  | { kind: 'pending' }
  | { kind: 'done'; purpose: EmailPurpose }
  | { kind: 'error'; message: string };

export const MagicLinkPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<State>({ kind: 'pending' });
  // StrictMode монтирует эффекты дважды — без флага токен улетал бы два раза.
  const hasSent = useRef(false);

  useEffect(() => {
    if (hasSent.current) {
      return;
    }
    hasSent.current = true;

    if (!token) {
      setState({ kind: 'error', message: NO_TOKEN_ERROR });
      return;
    }

    announceRouteChange('Проверяем ссылку из письма');
    emailVerificationApi
      .confirm(token)
      .then(({ data }) => setState({ kind: 'done', purpose: data.purpose }))
      .catch((error: unknown) => {
        setState({ kind: 'error', message: apiErrorMessage(error, GENERIC_ERROR) });
      });
  }, [token]);

  // «Готово» ведёт на главную, а не закрывает вкладку: window.close() работает
  // только для окон, открытых скриптом, и на кнопке из письма промолчал бы.
  const goHome = () => void navigate('/', { replace: true });

  if (state.kind === 'pending') {
    return (
      <main id="main-content" className="magic-link" tabIndex={-1}>
        <p className="magic-link__status" role="status">
          <Spinner />
          Проверяем ссылку из письма…
        </p>
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <ResultScreen
        title={'Ссылка\nне сработала'}
        description={state.message}
        onDone={goHome}
        announce={`Ссылка не сработала. ${state.message}`}
      />
    );
  }

  const { title, description } = RESULT_COPY[state.purpose];
  return (
    <ResultScreen
      title={title}
      description={description}
      onDone={goHome}
      announce={`${title.replace('\n', ' ')}. ${description}`}
    />
  );
};
