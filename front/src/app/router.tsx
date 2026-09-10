import { createBrowserRouter, redirect } from 'react-router';

import { useAuthStore } from '@/features/auth';
import { useOnboardingStore } from '@/features/onboarding';
import { AccountPage } from '@/pages/AccountPage';
import { AgreementsPage } from '@/pages/AgreementsPage';
import { CallRoomPage } from '@/pages/CallRoomPage';
import { CallWaitingPage } from '@/pages/CallWaitingPage';
import { CodePage } from '@/pages/CodePage';
import { DialogPage } from '@/pages/DialogPage';
import { HelpPage } from '@/pages/HelpPage';
import { HistoryDetailPage } from '@/pages/HistoryDetailPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { HomePage } from '@/pages/HomePage';
import { InvitationPage } from '@/pages/InvitationPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { PhoneAuthPage } from '@/pages/PhoneAuthPage';
import { REGISTRATION_FIELD_STEPS, RegistrationFieldPage } from '@/pages/RegistrationFieldPage';
import { RegistrationIpraPage } from '@/pages/RegistrationIpraPage';
import { RegistrationPermissionsPage } from '@/pages/RegistrationPermissionsPage';
import { RegistrationVisionPage } from '@/pages/RegistrationVisionPage';
import { StartPage } from '@/pages/StartPage';
import { VolunteerPage } from '@/pages/VolunteerPage';
import { WelcomePage } from '@/pages/WelcomePage';
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
            { index: true, element: <HomePage />, handle: { title: 'Главная' } },
            {
              path: 'history',
              element: <HistoryPage />,
              handle: { title: 'История', headerVariant: 'back' },
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
              path: 'profile',
              element: <AccountPage />,
              handle: { title: 'Профиль', headerVariant: 'back' },
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
            { path: 'vision', element: <RegistrationVisionPage /> },
            { path: 'ipra', element: <RegistrationIpraPage /> },
            { path: 'permissions', element: <RegistrationPermissionsPage /> },
            { path: 'welcome', element: <WelcomePage /> },
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
        { path: 'dialog', element: <DialogPage />, loader: requireAuth },
        { path: 'call/waiting', element: <CallWaitingPage />, loader: requireAuth },
        { path: 'call/room', element: <CallRoomPage />, loader: requireAuth },
        { path: 'history/:id', element: <HistoryDetailPage />, loader: requireAuth },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ]);
