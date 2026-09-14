import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';

import { emailVerificationApi } from '@/features/email-verification';
import { useChangeEmail, useProfile } from '@/features/profile';
import { useGoBack } from '@/shared/lib/navigation';

import { EmailDoneStep } from './EmailDoneStep';
import { EmailInputStep } from './EmailInputStep';
import { EmailSentStep } from './EmailSentStep';
import { EmailVerifyStep } from './EmailVerifyStep';

type Step = 'verify' | 'input' | 'sent' | 'done';

const SETTINGS_PATH = '/profile/settings';

export const ProfileEmailPage = () => {
  const navigate = useNavigate();
  const goBack = useGoBack(SETTINGS_PATH);
  const { data: profile, isPending } = useProfile();
  const changeEmail = useChangeEmail();

  const [step, setStep] = useState<Step>('verify');
  const [email, setEmail] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);

  if (isPending) {
    return null;
  }

  // Код подтверждения слать некуда — без телефона флоу не начать.
  if (!profile?.phone) {
    return <Navigate to={SETTINGS_PATH} replace />;
  }

  const sendLetter = async (address: string) => {
    const { data } = await emailVerificationApi.request('change_email', address);
    setVerificationId(data.id);
  };

  const submitEmail = async (next: string) => {
    await sendLetter(next);
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
            if (!verificationId) {
              throw new Error('Письмо ещё не отправлено. Вернитесь назад и попробуйте снова.');
            }
            await changeEmail.mutateAsync(verificationId);
            setStep('done');
          }}
          // Повторная отправка выпускает НОВЫЙ тикет и гасит прежний, поэтому
          // id обязан обновиться — иначе «Я перешёл по ссылке» проверял бы
          // тикет, которого уже нет.
          onResend={() => sendLetter(email)}
          onBack={() => setStep('input')}
        />
      );
    case 'done':
      return <EmailDoneStep onDone={() => void navigate(SETTINGS_PATH, { replace: true })} />;
  }
};
