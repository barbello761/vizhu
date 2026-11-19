import type { ComponentType } from 'react';
import { createBrowserRouter, redirect } from 'react-router';

import { useAuthStore } from '@/features/auth';
import { useOnboardingStore } from '@/features/onboarding';
import { env } from '@/shared/config';
import { PageLayout } from '@/widgets/page-layout';
import { RootLayout } from '@/widgets/root-layout';

/**
 * Экран грузится отдельным чанком при первом заходе на роут: на старте
 * приложению нужен только текущий экран, а не все три десятка. Гарды
 * (loader) остаются в основном бандле — react-router гоняет их параллельно
 * с загрузкой чанка, и редирект не ждёт кода экрана, на который не попадём.
 */
const page =
  <M,>(load: () => Promise<M>, pick: (module: M) => ComponentType) =>
  async () => ({ Component: pick(await load()) });

/**
 * Шаги регистрации — один экран с разной конфигурацией. key заставляет форму
 * перемонтироваться при переходе между шагами: без него react-router
 * переиспользует инстанс и defaultValues остаются от прошлого шага.
 */
const registrationFieldStep = (step: 'name' | 'email') => async () => {
  const { REGISTRATION_FIELD_STEPS, RegistrationFieldPage } =
    await import('@/pages/registration-field-page');
  return { element: <RegistrationFieldPage key={step} step={REGISTRATION_FIELD_STEPS[step]} /> };
};

const isAuthed = () => useAuthStore.getState().isAuthed;
const isRegistered = () => useAuthStore.getState().isRegistered;
const hasSeenOnboarding = () => useOnboardingStore.getState().hasSeen;

/**
 * Гард приложения. Порядок шагов = порядок экранов входа.
 *
 * Проверка `isRegistered` обязательна: `isAuthed` поднимается сразу после
 * проверки кода, поэтому прерванная регистрация (закрыли приложение, упал
 * POST /profile) оставляет валидный токен без профиля. Без этого шага такой
 * пользователь при следующем запуске попадал прямо в приложение мимо
 * регистрации — и без профиля на бэке.
 */
const requireRegistered = () => {
  if (!isAuthed()) {
    return redirect('/auth');
  }
  if (!isRegistered()) {
    return redirect('/registration/agreements');
  }
  return null;
};

const requireAuth = () => {
  const redirectTo = requireRegistered();
  if (redirectTo) {
    return redirectTo;
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
              lazy: page(
                () => import('@/pages/home-page'),
                (m) => m.HomePage,
              ),
              handle: { title: 'ИИ-камера', headerVariant: 'none' },
            },
            {
              // Заголовок «История» нарисован в самом экране — хедер не нужен.
              path: 'history',
              lazy: page(
                () => import('@/pages/history-page'),
                (m) => m.HistoryPage,
              ),
              handle: { headerVariant: 'none' },
            },
            {
              // Заголовок и «назад» в макете «Помощи» отсутствуют — только тело
              // (плитка звонка волонтёру + близкие) и таб-бар.
              path: 'help',
              lazy: page(
                () => import('@/pages/help-page'),
                (m) => m.HelpPage,
              ),
              handle: { title: 'Помощь', headerVariant: 'none' },
            },
            {
              // Заголовок нарисован в самом экране, «назад» не нужен —
              // это корневой экран раздела с таб-баром.
              path: 'volunteer',
              lazy: page(
                () => import('@/pages/volunteer-page'),
                (m) => m.VolunteerPage,
              ),
              handle: { title: 'Кабинет волонтёра', headerVariant: 'none' },
            },
            {
              // Заголовок и «назад» не нужны — это корневой экран раздела с таб-баром.
              path: 'profile',
              lazy: page(
                () => import('@/pages/profile-page'),
                (m) => m.ProfilePage,
              ),
              handle: { title: 'Профиль', headerVariant: 'none' },
            },
          ],
        },
        {
          path: 'auth',
          loader: redirectIfAuthed,
          children: [
            {
              index: true,
              lazy: page(
                () => import('@/pages/start-page'),
                (m) => m.StartPage,
              ),
              handle: { title: 'Вход' },
            },
            // Только сборка демо-стенда: на проде роута нет, адрес уходит в 404.
            ...(env.isDemo
              ? [
                  {
                    path: 'demo',
                    lazy: page(
                      () => import('@/pages/demo-notice-page'),
                      (m) => m.DemoNoticePage,
                    ),
                    handle: { title: 'Демо-версия' },
                  },
                ]
              : []),
            {
              path: 'phone',
              lazy: page(
                () => import('@/pages/phone-auth-page'),
                (m) => m.PhoneAuthPage,
              ),
              handle: { title: 'Ввод номера телефона' },
            },
            {
              path: 'code',
              lazy: page(
                () => import('@/pages/code-page'),
                (m) => m.CodePage,
              ),
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
              lazy: page(
                () => import('@/pages/agreements-page'),
                (m) => m.AgreementsPage,
              ),
              handle: { title: 'Согласие на обработку данных' },
            },
            {
              path: 'name',
              lazy: registrationFieldStep('name'),
              handle: { title: 'Ввод имени' },
            },
            {
              path: 'email',
              lazy: registrationFieldStep('email'),
              handle: { title: 'Ввод электронной почты' },
            },
            {
              path: 'ipra',
              lazy: page(
                () => import('@/pages/registration-ipra-page'),
                (m) => m.RegistrationIpraPage,
              ),
              handle: { title: 'Подтверждение статуса ИПРА' },
            },
          ],
        },
        {
          // Онбординг идёт уже после регистрации — сюда нельзя попасть
          // с токеном, но без профиля.
          path: 'onboarding',
          lazy: page(
            () => import('@/pages/onboarding-page'),
            (m) => m.OnboardingPage,
          ),
          loader: requireRegistered,
          handle: { title: 'Добро пожаловать' },
        },
        {
          path: 'invitation',
          lazy: page(
            () => import('@/pages/invitation-page'),
            (m) => m.InvitationPage,
          ),
          handle: { title: 'Приглашение' },
        },
        // Вложенные экраны профиля — без таб-бара, со своей кнопкой «назад».
        {
          path: 'profile/settings',
          lazy: page(
            () => import('@/pages/profile-settings-page'),
            (m) => m.ProfileSettingsPage,
          ),
          loader: requireAuth,
          handle: { title: 'Настройки профиля' },
        },
        {
          path: 'profile/settings/name',
          lazy: page(
            () => import('@/pages/profile-name-page'),
            (m) => m.ProfileNamePage,
          ),
          loader: requireAuth,
          handle: { title: 'Смена имени' },
        },
        {
          path: 'profile/settings/email',
          lazy: page(
            () => import('@/pages/profile-email-page'),
            (m) => m.ProfileEmailPage,
          ),
          loader: requireAuth,
          handle: { title: 'Смена электронной почты' },
        },
        {
          path: 'profile/settings/phone',
          lazy: page(
            () => import('@/pages/profile-phone-page'),
            (m) => m.ProfilePhonePage,
          ),
          loader: requireAuth,
          handle: { title: 'Смена номера телефона' },
        },
        {
          path: 'about',
          lazy: page(
            () => import('@/pages/about-page'),
            (m) => m.AboutPage,
          ),
          loader: requireAuth,
          handle: { title: 'О приложении' },
        },
        // Пригласить близкого — доступа из UI пока нет, только по прямой ссылке.
        {
          path: 'inviting',
          lazy: page(
            () => import('@/pages/inviting-page'),
            (m) => m.InvitingPage,
          ),
          loader: requireAuth,
          handle: { title: 'Пригласите близкого' },
        },
        // ─── Выход из аккаунта ──────────────────────────────────────────────
        {
          path: 'logout',
          lazy: page(
            () => import('@/pages/logout-page'),
            (m) => m.LogoutPage,
          ),
          loader: requireAuth,
          handle: { title: 'Выход из аккаунта' },
        },
        {
          // После выхода пользователь уже не авторизован — гард здесь не нужен.
          path: 'logout/done',
          lazy: page(
            () => import('@/pages/logout-done-page'),
            (m) => m.LogoutDonePage,
          ),
          handle: { title: 'Вы вышли из аккаунта' },
        },
        // ─── Выход со всех устройств (подтверждение отключено, нет метода) ───
        {
          path: 'logout-all',
          lazy: page(
            () => import('@/pages/logout-all-page'),
            (m) => m.LogoutAllPage,
          ),
          loader: requireAuth,
          handle: { title: 'Выход со всех устройств' },
        },
        {
          path: 'logout-all/done',
          lazy: page(
            () => import('@/pages/logout-all-done-page'),
            (m) => m.LogoutAllDonePage,
          ),
          loader: requireAuth,
          handle: { title: 'Вы вышли со всех устройств' },
        },
        // ─── Удаление аккаунта ──────────────────────────────────────────────
        {
          path: 'delete-account',
          lazy: page(
            () => import('@/pages/delete-account-page'),
            (m) => m.DeleteAccountPage,
          ),
          loader: requireAuth,
          handle: { title: 'Удаление аккаунта' },
        },
        {
          // Аккаунта и сессии уже нет — гард здесь отправил бы на /auth
          // раньше, чем пользователь услышал бы, что удаление прошло.
          path: 'delete-account/done',
          lazy: page(
            () => import('@/pages/delete-account-done-page'),
            (m) => m.DeleteAccountDonePage,
          ),
          handle: { title: 'Аккаунт удалён' },
        },
        {
          path: 'camera',
          lazy: page(
            () => import('@/pages/camera-page'),
            (m) => m.CameraPage,
          ),
          loader: requireAuth,
        },
        {
          path: 'dialog',
          lazy: page(
            () => import('@/pages/dialog-page'),
            (m) => m.DialogPage,
          ),
          loader: requireAuth,
        },
        // Запись из истории открывается тем же экраном диалога о фото.
        {
          path: 'dialog/:id',
          lazy: page(
            () => import('@/pages/dialog-page'),
            (m) => m.DialogPage,
          ),
          loader: requireAuth,
        },
        {
          path: 'call/waiting',
          lazy: page(
            () => import('@/pages/call-waiting-page'),
            (m) => m.CallWaitingPage,
          ),
          loader: requireAuth,
        },
        {
          path: 'call/room',
          lazy: page(
            () => import('@/pages/call-room-page'),
            (m) => m.CallRoomPage,
          ),
          loader: requireAuth,
        },
        // Переход по ссылке из письма. Открывается в браузере почтового
        // клиента, где сессии приложения нет, — поэтому без гарда: пропуском
        // служит токен из адреса.
        {
          path: 'magic-link',
          lazy: page(
            () => import('@/pages/magic-link-page'),
            (m) => m.MagicLinkPage,
          ),
          handle: { title: 'Подтверждение по ссылке' },
        },
        {
          path: '*',
          lazy: page(
            () => import('@/pages/not-found-page'),
            (m) => m.NotFoundPage,
          ),
        },
      ],
    },
  ]);
