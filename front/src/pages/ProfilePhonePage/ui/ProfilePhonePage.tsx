import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';

import { profileApi, useChangePhone, useProfile } from '@/features/profile';
import { useGoBack } from '@/shared/lib/navigation';
import { MailConfirmScreen, type MailVerification } from '@/widgets/MailConfirmScreen';

import { PhoneCodeStep } from './PhoneCodeStep';
import { PhoneDoneStep } from './PhoneDoneStep';
import { PhoneInputStep } from './PhoneInputStep';

type Step = 'mail' | 'phone' | 'code' | 'done';

const SETTINGS_PATH = '/profile/settings';

const MAIL_LEAD = 'Нам нужно убедиться, что именно вы пытаетесь сменить номер телефона.';

export const ProfilePhonePage = () => {
  const navigate = useNavigate();
  const goBack = useGoBack(SETTINGS_PATH);
  const { data: profile, isPending } = useProfile();
  const changePhone = useChangePhone();

  const [step, setStep] = useState<Step>('mail');
  const [phone, setPhone] = useState('');
  // Живёт на уровне флоу, а не экрана: кнопка «назад» с ввода номера вернёт на
  // «Проверьте почту», и письмо не должно отправляться заново.
  const [verification, setVerification] = useState<MailVerification | null>(null);

  if (isPending) {
    return null;
  }

  // Подтверждать смену нечем: письмо слать некуда, а другого второго фактора
  // у аккаунта нет. Настройки показывают это же объяснение у карандаша.
  if (!profile?.emailVerified) {
    return <Navigate to={SETTINGS_PATH} replace />;
  }

  switch (step) {
    case 'mail':
      return (
        <MailConfirmScreen
          purpose="change_phone"
          lead={MAIL_LEAD}
          verification={verification}
          onVerificationChange={setVerification}
          onConfirmed={() => setStep('phone')}
          onBack={goBack}
          backLabel="Назад, к настройкам профиля"
        />
      );
    case 'phone':
      return (
        <PhoneInputStep
          initialValue={phone}
          onSubmit={async (next) => {
            await profileApi.sendPhoneOtp(next);
            setPhone(next);
            setStep('code');
          }}
          onBack={() => setStep('mail')}
        />
      );
    case 'code':
      return (
        <PhoneCodeStep
          phone={phone}
          onSubmit={async (code) => {
            if (!verification) {
              throw new Error('Подтверждение по почте потерялось. Начните смену номера заново.');
            }
            await changePhone.mutateAsync({ phone, code, verificationId: verification.id });
            setStep('done');
          }}
          onBack={() => setStep('phone')}
        />
      );
    case 'done':
      return (
        <PhoneDoneStep
          phone={phone}
          onDone={() => void navigate(SETTINGS_PATH, { replace: true })}
        />
      );
  }
};
