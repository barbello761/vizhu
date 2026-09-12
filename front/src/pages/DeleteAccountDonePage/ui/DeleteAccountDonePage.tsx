import { useNavigate } from 'react-router';

import { ResultScreen } from '@/widgets/ResultScreen';

/** Аккаунт удалён — сессии уже нет, отсюда только на экран входа. */
export const DeleteAccountDonePage = () => {
  const navigate = useNavigate();

  return (
    <ResultScreen
      title={'Аккаунт\nудалён'}
      description="Мы стёрли ваш профиль, историю запросов и настройки. Спасибо, что были с нами — вернуться можно в любой момент, зарегистрировавшись заново."
      onDone={() => void navigate('/auth', { replace: true })}
      announce="Аккаунт удалён. Профиль, история и настройки стёрты."
    />
  );
};
