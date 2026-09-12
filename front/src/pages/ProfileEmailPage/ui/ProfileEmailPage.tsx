import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';

import { confirmEmailChange, requestEmailChange, useProfile } from '@/features/profile';
import { useGoBack } from '@/shared/lib/navigation';

import { EmailDoneStep } from './EmailDoneStep';
import { EmailInputStep } from './EmailInputStep';
import { EmailSentStep } from './EmailSentStep';
import { EmailVerifyStep } from './EmailVerifyStep';

type Step = 'verify' | 'input' | 'sent' | 'done';

const SETTINGS_PATH = '/profile/settings';

/**
 * Смена электронной почты — четыре экрана макета одним роутом.
 *
 * Шаги держатся в состоянии, а не в адресе, именно потому, что попасть на
 * любой из них можно только пройдя предыдущий: прямая ссылка на «Проверьте
 * почту» в обход подтверждения по коду не имеет смысла. Кнопка «назад» внутри
 * флоу шагает назад, а с первого шага выходит на настройки профиля.
 *
 * Сохранения почты здесь нет — см. features/profile/lib/email-change.ts.
 */
export const ProfileEmailPage = () => {
  const navigate = useNavigate();
  const goBack = useGoBack(SETTINGS_PATH);
  const { data: profile, isPending } = useProfile();

  const [step, setStep] = useState<Step>('verify');
  const [email, setEmail] = useState('');

  if (isPending) {
    return null;
  }

  // Код подтверждения слать некуда — без телефона флоу не начать.
  if (!profile?.phone) {
    return <Navigate to={SETTINGS_PATH} replace />;
  }

  const submitEmail = async (next: string) => {
    await requestEmailChange(next);
    setEmail(next);
    setStep('sent');
  };

  switch (step) {
    case 'verify':
      return (
        <EmailVerifyStep
          phone={profile.phone}
          onVerified={() => setStep('input')}
          onBack={goBack}
        />
      );
    case 'input':
      return (
        <EmailInputStep
          initialValue={email}
          onSubmit={submitEmail}
          onBack={() => setStep('verify')}
        />
      );
    case 'sent':
      return (
        <EmailSentStep
          email={email}
          onConfirm={async () => {
            await confirmEmailChange();
            setStep('done');
          }}
          onResend={() => requestEmailChange(email)}
          onBack={() => setStep('input')}
        />
      );
    case 'done':
      return <EmailDoneStep onDone={() => void navigate(SETTINGS_PATH, { replace: true })} />;
  }
};
