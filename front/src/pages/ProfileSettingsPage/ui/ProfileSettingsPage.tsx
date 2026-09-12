import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { formatPhone } from '@/features/auth';
import { useProfile } from '@/features/profile';
import { announceRouteChange } from '@/shared/lib/a11y';
import { useGoBack } from '@/shared/lib/navigation';
import { Button, CallIcon, ChevronBackIcon, EditableField, MailIcon } from '@/shared/ui/v2';

import './ProfileSettingsPage.scss';

const PHONE_EDIT_HINT =
  'Смена номера телефона появится вместе с подтверждением по электронной почте';

export const ProfileSettingsPage = () => {
  const navigate = useNavigate();
  const goBack = useGoBack('/profile');
  const { data: profile } = useProfile();

  useEffect(() => {
    announceRouteChange('Настройки профиля. Имя, телефон и почта, выход из аккаунта.');
  }, []);

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
          editDisabled
          editDisabledHint={PHONE_EDIT_HINT}
        />
        <EditableField
          label="Электронная почта"
          icon={<MailIcon />}
          value={profile?.email ?? ''}
          editLabel="Изменить электронную почту"
          onEdit={() => void navigate('/profile/settings/email')}
        />
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
