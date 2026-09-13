import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useDeleteProfile, useProfile } from '@/features/profile';
import { announceRouteChange } from '@/shared/lib/a11y';
import { useGoBack } from '@/shared/lib/navigation';
import { ActionScreen } from '@/widgets/ActionScreen';
import { MailConfirmScreen, type MailVerification } from '@/widgets/MailConfirmScreen';

const DELETE_ERROR = 'Не удалось удалить аккаунт. Попробуйте ещё раз.';
const DONE_PATH = '/delete-account/done';

const MAIL_LEAD = 'Нам нужно убедиться, что именно вы удаляете аккаунт.';

export const DeleteAccountPage = () => {
  const navigate = useNavigate();
  const goBack = useGoBack('/profile/settings');
  const { data: profile } = useProfile();
  const deleteProfile = useDeleteProfile();

  const [step, setStep] = useState<'confirm' | 'mail'>('confirm');
  const [verification, setVerification] = useState<MailVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Сессия гасится мутацией — на экран «готово» уходим с replace, чтобы «назад»
  // не вернуло на подтверждение удаления несуществующего аккаунта.
  const finish = () => void navigate(DONE_PATH, { replace: true });

  const handleConfirm = async () => {
    if (profile?.emailVerified) {
      setStep('mail');
      return;
    }

    try {
      await deleteProfile.mutateAsync(undefined);
      finish();
    } catch {
      setError(DELETE_ERROR);
      announceRouteChange(DELETE_ERROR);
    }
  };

  if (step === 'mail') {
    return (
      <MailConfirmScreen
        purpose="delete_account"
        lead={MAIL_LEAD}
        tone="danger"
        confirmLabel="Я перешёл по ссылке"
        verification={verification}
        onVerificationChange={setVerification}
        onConfirmed={async (verificationId) => {
          await deleteProfile.mutateAsync(verificationId);
          finish();
        }}
        onBack={() => setStep('confirm')}
        backLabel="Назад, к подтверждению удаления"
      />
    );
  }

  return (
    <ActionScreen
      title={'Удалить\nаккаунт?'}
      description="Аккаунт, история запросов и настройки будут удалены безвозвратно. Восстановить их не получится."
      note={error ?? undefined}
      tone="danger"
      confirmLabel="Удалить аккаунт"
      confirmLoading={deleteProfile.isPending}
      onConfirm={() => void handleConfirm()}
      onCancel={goBack}
      announce="Удалить аккаунт? Действие необратимо: аккаунт, история и настройки будут стёрты."
    />
  );
};
