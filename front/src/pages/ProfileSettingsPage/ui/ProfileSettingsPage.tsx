import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { formatPhone } from '@/features/auth';
import {
  toApiPhone,
  useProfile,
  useUpdateProfile,
  validateEmail,
  validateName,
  validatePhone,
} from '@/features/profile';
import { announceRouteChange } from '@/shared/lib/a11y';
import { useGoBack } from '@/shared/lib/navigation';
import { Button, CallIcon, ChevronBackIcon, EditableField, MailIcon } from '@/shared/ui/v2';

import './ProfileSettingsPage.scss';

export const ProfileSettingsPage = () => {
  const navigate = useNavigate();
  const goBack = useGoBack('/profile');
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  useEffect(() => {
    announceRouteChange('Настройки профиля. Имя, телефон и почта, выход из аккаунта.');
  }, []);

  const save = async (patch: Parameters<typeof updateProfile.mutateAsync>[0], done: string) => {
    await updateProfile.mutateAsync(patch);
    announceRouteChange(done);
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

      <div className="profile-settings__fields">
        <EditableField
          label="Имя"
          value={profile?.name ?? ''}
          autoComplete="name"
          editLabel="Изменить имя"
          validate={validateName}
          onSave={(next) => save({ name: next }, 'Имя обновлено')}
        />
        <EditableField
          label="Номер телефона"
          icon={<CallIcon />}
          value={profile?.phone ? formatPhone(profile.phone) : ''}
          editValue={profile?.phone ?? ''}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          editLabel="Изменить номер телефона"
          validate={validatePhone}
          onSave={(next) => save({ phone: toApiPhone(next) }, 'Номер телефона обновлён')}
        />
        <EditableField
          label="Электронная почта"
          icon={<MailIcon />}
          value={profile?.email ?? ''}
          type="email"
          inputMode="email"
          autoComplete="email"
          editLabel="Изменить электронную почту"
          validate={validateEmail}
          onSave={(next) => save({ email: next }, 'Электронная почта обновлена')}
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
