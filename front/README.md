# ВИЖУ — фронтенд

Клиент ВИЖУ: web (PWA) и мобильное приложение на Capacitor (Android/iOS) из одной кодовой базы.

## Стек

| Категория            | Библиотека                                                     |
| -------------------- | -------------------------------------------------------------- |
| UI                   | React 19 + TypeScript                                          |
| Бандлер              | Vite 7 (SWC), PWA — vite-plugin-pwa                            |
| Мобильная оболочка   | Capacitor 8                                                    |
| Серверное состояние  | TanStack Query v5                                              |
| Клиентское состояние | Zustand v5 + Immer                                             |
| Роутинг              | React Router v7 (data router, ленивые экраны)                  |
| HTTP                 | Axios                                                          |
| Звонки               | livekit-client (видео), socket.io-client (матчинг)             |
| Стилизация           | SCSS + CSS-переменные, modern-normalize                        |
| Формы и валидация    | react-hook-form + Zod                                          |
| Уведомления          | sonner                                                         |
| Тесты                | Vitest + React Testing Library + MSW                           |
| Качество кода        | ESLint (flat config), Stylelint, Prettier, Husky + lint-staged |

## Начало работы

```bash
npm install
cp .env.example .env.development   # уже заполнен для локальной разработки
npm run dev                        # → http://localhost:5173
```

## Скрипты

| Скрипт                      | Описание                                              |
| --------------------------- | ----------------------------------------------------- |
| `npm run dev`               | Dev-сервер                                            |
| `npm run build`             | Продакшн-сборка web → `dist/`                         |
| `npm run build:dev`         | Dev-сборка (с source maps)                            |
| `npm run build:demo`        | Сборка демо-стенда (`.env.demo`)                      |
| `npm run build:native`      | Сборка для Capacitor → `dist-native/` (`.env.native`) |
| `npm run android` / `ios`   | Нативная сборка + `cap sync` + запуск на устройстве   |
| `npm run preview`           | Предпросмотр продакшн-сборки                          |
| `npm run lint` / `lint:fix` | ESLint (ноль предупреждений)                          |
| `npm run lint:css`          | Stylelint                                             |
| `npm run format`            | Проверка Prettier                                     |
| `npm run test`              | Юнит-тесты                                            |
| `npm run test:coverage`     | Отчёт о покрытии                                      |

## Архитектура: Feature Sliced Design

```
src/
├── app/        # Точка входа, провайдеры, роутер (экраны грузятся лениво), глобальные стили
├── pages/      # Экраны — цели роутов
├── widgets/    # Крупные секции: лейауты, оркестратор звонков, типовые экраны
├── features/   # Пользовательские сценарии: auth, calls, profile, ai-dialog…
├── entities/   # Бизнес-сущности: user, history
└── shared/     # Инфраструктура без бизнес-логики: api, config, lib, platform, ui
```

Импорты идут только вниз: `app → pages → widgets → features → entities → shared`.

### Именование

- Папки и файлы — kebab-case: `pages/home-page`, `use-go-back.ts`.
- Главный компонент папки — `index.tsx` (`shared/ui/button/ui/index.tsx`), второстепенные лежат рядом
  в kebab-case (`ui/action-link.tsx`), стили — `<имя-компонента>.scss`, тесты — `__tests__/<имя>.test.tsx`.
- Публичный API слайса — его `index.ts`.

### Платформенный слой

Всё, что отличается между web и Capacitor (хранилище, камера, разрешения, хаптика, статус-бар),
идёт через порты `src/shared/platform` — см. [README слоя](src/shared/platform/README.md).
Нативные плагины подгружаются динамически и в web-бандл не попадают.

## Переменные окружения

| Переменная             | Обязательна | По умолчанию  | Описание                                   |
| ---------------------- | ----------- | ------------- | ------------------------------------------ |
| `VITE_API_URL`         | ✅          | —             | Базовый URL API (в Capacitor — абсолютный) |
| `VITE_SOCKET_URL`      | ❌          | origin окна   | Socket.IO матчинга                         |
| `VITE_API_TIMEOUT`     | ❌          | `15000`       | Таймаут запроса (мс)                       |
| `VITE_APP_TITLE`       | ❌          | `ВИЖУ`        | Заголовок приложения                       |
| `VITE_APP_ENV`         | ❌          | `development` | `development` / `production` / `test`      |
| `VITE_ENABLE_DEVTOOLS` | ❌          | `false`       | TanStack Query + Zustand DevTools          |
| `VITE_ENABLE_MOCKS`    | ❌          | `false`       | MSW-моки вместо бэкенда (только dev)       |
| `VITE_DEMO_MODE`       | ❌          | `false`       | Сборка демо-стенда                         |
| `VITE_DEMO_OTP_CODE`   | ❌          | —             | Запасной код входа демо-стенда (4 цифры)   |

Проверяются при запуске в [src/shared/config/env.ts](src/shared/config/env.ts): без обязательных
переменных приложение падает сразу, а сборка без `VITE_API_URL` — ещё в `vite build`.

## Тестирование

```bash
npm run test
npm run test:coverage
```

MSW-хэндлеры — в [src/shared/api/mocks/handlers.ts](src/shared/api/mocks/handlers.ts): их используют
и тесты, и dev-сервер с `VITE_ENABLE_MOCKS=true`. Воркер `public/mockServiceWorker.js` нужен только
dev-серверу и вырезается из всех сборок.

## Бандл

```bash
ANALYZE=true npm run build   # откроет dist/stats.html с размерами gzip/brotli
```

- Каждый экран — отдельный чанк (`route.lazy` в [router.tsx](src/app/router.tsx)); гарды остаются
  в основном бандле.
- `react-vendor` (React, react-dom, роутер) и `query-vendor` выделены для долгосрочного кэша в web.
- Тяжёлое грузится по требованию: socket.io — при выходе на линию или вызове помощи, sonner — после
  первого экрана. livekit (`livekit-vendor`, ~130 КБ gzip — предупреждение Vite о чанке >500 КБ про
  него, на старт не влияет) скачивается фоном, как только начался сценарий звонка
  (`preloadCallRoomOnCallStart`), чтобы после матча комната открылась без паузы.
- В `public/` держите только реально подключённые файлы: Capacitor копирует его в APK/IPA целиком,
  а Workbox прекэширует шрифты, картинки и видео.
