import { createBrowserRouter, redirect } from 'react-router';

import { useAuthStore } from '@/features/auth';
import { useOnboardingStore } from '@/features/onboarding';
import { AboutPage } from '@/pages/AboutPage';
import { AgreementsPage } from '@/pages/AgreementsPage';
import { CallRoomPage } from '@/pages/CallRoomPage';
import { CallWaitingPage } from '@/pages/CallWaitingPage';
import { CameraPage } from '@/pages/CameraPage';
import { CodePage } from '@/pages/CodePage';
import { DeleteAccountDonePage } from '@/pages/DeleteAccountDonePage';
import { DeleteAccountPage } from '@/pages/DeleteAccountPage';
import { DialogPage } from '@/pages/DialogPage';
import { HelpPage } from '@/pages/HelpPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { HomePage } from '@/pages/HomePage';
import { InvitationPage } from '@/pages/InvitationPage';
import { InvitingPage } from '@/pages/InvitingPage';
import { LogoutAllDonePage } from '@/pages/LogoutAllDonePage';
import { LogoutAllPage } from '@/pages/LogoutAllPage';
import { LogoutDonePage } from '@/pages/LogoutDonePage';
import { LogoutPage } from '@/pages/LogoutPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { PhoneAuthPage } from '@/pages/PhoneAuthPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ProfileSettingsPage } from '@/pages/ProfileSettingsPage';
import { REGISTRATION_FIELD_STEPS, RegistrationFieldPage } from '@/pages/RegistrationFieldPage';
import { RegistrationIpraPage } from '@/pages/RegistrationIpraPage';
import { StartPage } from '@/pages/StartPage';
import { VolunteerPage } from '@/pages/VolunteerPage';
import { PageLayout } from '@/widgets/PageLayout';
import { RootLayout } from '@/widgets/RootLayout';

const isAuthed = () => useAuthStore.getState().isAuthed;
const hasSeenOnboarding = () => useOnboardingStore.getState().hasSeen;

const requireAuth = () => {
  if (!isAuthed()) {
    return redirect('/auth');
  }
  if (!hasSeenOnboarding()) {
    return redirect('/onboarding');
  }
  return null;
};

const requireAuthOnly = () => {
  if (!isAuthed()) {
    return redirect('/auth');
  }
  return null;
};

const redirectIfAuthed = () => (isAuthed() ? redirect('/') : null);

const requirePhone = () => {
  if (!useAuthStore.getState().phone) {
    return redirect('/auth/phone');
  }
  return null;
};

/**
 * Фабрика вместо готового инстанса: createBrowserRouter запускает лоадеры
 * (гарды) СРАЗУ при создании. Если создать роутер на импорте модуля, гарды
 * отработают до platform-init/bootstrapAuth (рехидрейт Preferences + тихий
 * refresh) и увидят isAuthed=false — залогиненный пользователь получит экран
 * входа. Поэтому роутер создаётся в main.tsx только после бутстрапа.
 */
export const createAppRouter = () =>
  createBrowserRouter([
    {
      element: <RootLayout />,
      children: [
        {
          element: <PageLayout />,
          loader: requireAuth,
          children: [
            {
              index: true,
              element: <HomePage />,
              handle: { title: 'ИИ-камера', headerVariant: 'none' },
            },
            {
              // Заголовок «История» нарисован в самом экране — хедер не нужен.
              path: 'history',
              element: <HistoryPage />,
              handle: { headerVariant: 'none' },
            },
            {
              path: 'help',
              element: <HelpPage />,
              handle: { title: 'Помощь', headerVariant: 'back' },
            },
            {
              path: 'volunteer',
              element: <VolunteerPage />,
              handle: { title: 'Кабинет волонтёра', headerVariant: 'back' },
            },
            {
              // Заголовок и «назад» не нужны — это корневой экран раздела с таб-баром.
              path: 'profile',
              element: <ProfilePage />,
              handle: { title: 'Профиль', headerVariant: 'none' },
            },
          ],
        },
        {
          path: 'auth',
          loader: redirectIfAuthed,
          children: [
            { index: true, element: <StartPage />, handle: { title: 'Вход' } },
            {
              path: 'phone',
              element: <PhoneAuthPage />,
              handle: { title: 'Ввод номера телефона' },
            },
            {
              path: 'code',
              element: <CodePage />,
              loader: requirePhone,
              handle: { title: 'Ввод кода из СМС' },
            },
          ],
        },
        {
          path: 'registration',
          loader: requireAuthOnly,
          children: [
            {
              path: 'agreements',
              element: <AgreementsPage />,
              handle: { title: 'Согласие на обработку данных' },
            },
            {
              path: 'name',
              // key заставляет форму перемонтироваться при переходе между шагами:
              // без него react-router переиспользует инстанс и defaultValues остаются от прошлого шага.
              element: <RegistrationFieldPage key="name" step={REGISTRATION_FIELD_STEPS.name} />,
              handle: { title: 'Ввод имени' },
            },
            {
              path: 'email',
              element: <RegistrationFieldPage key="email" step={REGISTRATION_FIELD_STEPS.email} />,
              handle: { title: 'Ввод электронной почты' },
            },
            {
              path: 'ipra',
              element: <RegistrationIpraPage />,
              handle: { title: 'Подтверждение статуса ИПРА' },
            },
          ],
        },
        {
          path: 'onboarding',
          element: <OnboardingPage />,
          handle: { title: 'Добро пожаловать' },
        },
        {
          path: 'invitation',
          element: <InvitationPage />,
          handle: { title: 'Приглашение' },
        },
        // Вложенные экраны профиля — без таб-бара, со своей кнопкой «назад».
        {
          path: 'profile/settings',
          element: <ProfileSettingsPage />,
          loader: requireAuth,
          handle: { title: 'Настройки профиля' },
        },
        {
          path: 'about',
          element: <AboutPage />,
          loader: requireAuth,
          handle: { title: 'О приложении' },
        },
        // Пригласить близкого — доступа из UI пока нет, только по прямой ссылке.
        {
          path: 'inviting',
          element: <InvitingPage />,
          loader: requireAuth,
          handle: { title: 'Пригласите близкого' },
        },
        // ─── Выход из аккаунта ──────────────────────────────────────────────
        {
          path: 'logout',
          element: <LogoutPage />,
          loader: requireAuth,
          handle: { title: 'Выход из аккаунта' },
        },
        {
          // После выхода пользователь уже не авторизован — гард здесь не нужен.
          path: 'logout/done',
          element: <LogoutDonePage />,
          handle: { title: 'Вы вышли из аккаунта' },
        },
        // ─── Выход со всех устройств (подтверждение отключено, нет метода) ───
        {
          path: 'logout-all',
          element: <LogoutAllPage />,
          loader: requireAuth,
          handle: { title: 'Выход со всех устройств' },
        },
        {
          path: 'logout-all/done',
          element: <LogoutAllDonePage />,
          loader: requireAuth,
          handle: { title: 'Вы вышли со всех устройств' },
        },
        // ─── Удаление аккаунта (подтверждение отключено, нет метода) ─────────
        {
          path: 'delete-account',
          element: <DeleteAccountPage />,
          loader: requireAuth,
          handle: { title: 'Удаление аккаунта' },
        },
        {
          path: 'delete-account/done',
          element: <DeleteAccountDonePage />,
          loader: requireAuth,
          handle: { title: 'Проверьте почту' },
        },
        { path: 'camera', element: <CameraPage />, loader: requireAuth },
        { path: 'dialog', element: <DialogPage />, loader: requireAuth },
        // Запись из истории открывается тем же экраном диалога о фото.
        { path: 'dialog/:id', element: <DialogPage />, loader: requireAuth },
        { path: 'call/waiting', element: <CallWaitingPage />, loader: requireAuth },
        { path: 'call/room', element: <CallRoomPage />, loader: requireAuth },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ]);
