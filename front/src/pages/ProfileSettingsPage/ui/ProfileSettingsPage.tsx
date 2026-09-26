import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { formatPhone } from '@/features/auth';
import { emailVerificationApi, SPAM_HINT } from '@/features/email-verification';
import { useProfile } from '@/features/profile';
import { apiErrorMessage } from '@/shared/api';
import { announceRouteChange } from '@/shared/lib/a11y';
import { useGoBack } from '@/shared/lib/navigation';
import { Button, CallIcon, ChevronBackIcon, EditableField, MailIcon, Notice } from '@/shared/ui/';

import './ProfileSettingsPage.scss';

const PHONE_EDIT_HINT =
  'Сначала подтвердите электронную почту — на неё придёт письмо для смены номера';
const RESEND_ERROR = 'Не удалось отправить письмо. Попробуйте позже.';

export const ProfileSettingsPage = () => {
  const navigate = useNavigate();
  const goBack = useGoBack('/profile');
  const { data: profile } = useProfile();

  const [isResending, setIsResending] = useState(false);
  const [resendNote, setResendNote] = useState<string | null>(null);

  useEffect(() => {
    announceRouteChange('Настройки профиля. Имя, телефон и почта, выход из аккаунта.');
  }, []);

  // Почта есть, но по ссылке из письма не перешли: она не годится как резервный
  // вход и не подтверждает смену номера — значит, письмо нужно уметь повторить.
  const needsEmailConfirmation = Boolean(profile?.email) && !profile?.emailVerified;

  const handleResend = async () => {
    setIsResending(true);
    setResendNote(null);
    try {
      await emailVerificationApi.request('verify_email');
      const note = `Отправили письмо на ${profile?.email ?? 'вашу почту'}. ${SPAM_HINT}`;
      setResendNote(note);
      announceRouteChange(note);
    } catch (error) {
      const note = apiErrorMessage(error, RESEND_ERROR);
      setResendNote(note);
      announceRouteChange(note);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main
      id="main-content"
      className="profile-settings"
      tabIndex={-1}
      aria-labelledby="profile-settings-title"
    >
      <div className="profile-settings__header">
        <Button variant="icon" aria-label="Назад" onClick={goBack}>
          <ChevronBackIcon />
        </Button>
        <h1 id="profile-settings-title" className="profile-settings__title">
          Профиль
        </h1>
      </div>

      {/* Правка каждого поля живёт на своём экране — так в макете: строка
          здесь только показывает значение, карандаш уводит на флоу. */}
      <div className="profile-settings__fields">
        <EditableField
          label="Имя"
          value={profile?.name ?? ''}
          editLabel="Изменить имя"
          onEdit={() => void navigate('/profile/settings/name')}
        />
        <EditableField
          label="Номер телефона"
          icon={<CallIcon />}
          value={profile?.phone ? formatPhone(profile.phone) : ''}
          editLabel="Изменить номер телефона"
          // Смену номера подтверждает письмо: без подтверждённой почты второго
          // фактора нет, и флоу не с чего начинать.
          editDisabled={!profile?.emailVerified}
          editDisabledHint={PHONE_EDIT_HINT}
          onEdit={
            profile?.emailVerified ? () => void navigate('/profile/settings/phone') : undefined
          }
        />
        <EditableField
          label="Электронная почта"
          icon={<MailIcon />}
          value={profile?.email ?? ''}
          editLabel="Изменить электронную почту"
          onEdit={() => void navigate('/profile/settings/email')}
        />

        {needsEmailConfirmation && (
          <div className="profile-settings__email-hint">
            <Notice variant="plain">
              Почта не подтверждена. Перейдите по ссылке из письма — без этого она не работает как
              резервный вход и ею нельзя подтвердить смену номера. {SPAM_HINT}
            </Notice>
            <Button variant="tertiary" loading={isResending} onClick={() => void handleResend()}>
              Отправить письмо ещё раз
            </Button>
            {/* Без role="status": результат уже озвучен announceRouteChange,
                живой регион продиктовал бы его вторым заходом. */}
            {resendNote && <Notice variant="plain">{resendNote}</Notice>}
          </div>
        )}
      </div>

      <div className="profile-settings__actions">
        <Button variant="secondary" onClick={() => void navigate('/logout-all')}>
          Выйти со всех устройств
        </Button>
        <Button variant="secondary" onClick={() => void navigate('/logout')}>
          Выйти из аккаунта
        </Button>
        <Button variant="danger" onClick={() => void navigate('/delete-account')}>
          Удалить аккаунт
        </Button>
      </div>
    </main>
  );
};
