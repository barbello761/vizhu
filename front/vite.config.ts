import react from '@vitejs/plugin-react-swc';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Относительным путём, а не через алиас @: конфиг собирается до того, как
// resolve.alias из него же начинает действовать.
import { API_CACHE_NAME } from './src/shared/config/cache-names';

const VENDOR_CORE =
  /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/;
const VENDOR_QUERY = /[\\/]node_modules[\\/]@tanstack[\\/](react-query|query-core)[\\/]/;

/**
 * Воркер MSW нужен только dev-серверу с VITE_ENABLE_MOCKS. Он лежит в public,
 * чтобы `msw init` обновлял его на месте, — поэтому Vite копирует его в каждую
 * сборку. Вырезаем: в web он висел бы на проде, в Capacitor — уезжал в APK/IPA.
 */
const MSW_WORKER = 'mockServiceWorker.js';
const dropMswWorker = (): Plugin => ({
  name: 'vizhu:drop-msw-worker',
  apply: 'build',
  writeBundle({ dir }) {
    if (dir) {
      rmSync(resolve(dir, MSW_WORKER), { force: true });
    }
  },
});

export default defineConfig(async ({ command, mode }) => {
  // Загружаем .env.{mode} чтобы переменные были доступны на этапе конфигурации
  const env = loadEnv(mode, process.cwd(), '');
  // Демо-стенд и Capacitor-сборка — тот же прод, отличаются только .env.{mode}.
  const isProd = mode === 'production' || mode === 'demo' || mode === 'native';
  // Ассеты Capacitor лежат внутри приложения: сервис-воркер там не
  // регистрируется (см. main.tsx), значит sw.js и precache-манифест — мёртвый
  // груз в APK/IPA.
  const isNative = mode === 'native';

  // Без VITE_API_URL vite молча подставит undefined, сборка пройдёт, и упадёт
  // уже браузер пользователя на валидации в src/shared/config/env.ts. Роняем
  // здесь, чтобы забытый .env.{mode} ловился в CI, а не на проде.
  if (command === 'build' && !env.VITE_API_URL) {
    throw new Error(
      `VITE_API_URL не задан для сборки в режиме "${mode}". ` +
        `Проверьте front/.env.${mode} (образец — front/.env.example).`,
    );
  }

  // Куда vite-сервер проксирует /api и /socket.io при запуске БЕЗ докера
  const devProxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:3000';

  // Благодаря относительному VITE_API_URL=/api фронт и api для браузера
  // остаются одним origin — как в проде за nginx, и CORS не участвует.
  const devProxy = {
    '/api': {
      target: devProxyTarget,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api/, ''),
    },
    // Socket.IO матчинга волонтёров — тем же origin, что и в проде.
    '/socket.io': {
      target: devProxyTarget,
      changeOrigin: true,
      ws: true,
    },
  };

  // Анализатор бандла — включается через: ANALYZE=true npm run build
  const extraPlugins: Plugin[] = [];
  if (env.ANALYZE) {
    const { visualizer } = await import('rollup-plugin-visualizer');
    extraPlugins.push(
      visualizer({ open: true, gzipSize: true, brotliSize: true, filename: 'dist/stats.html' }),
    );
  }

  const pwaPlugin = VitePWA({
    disable: isNative,
    registerType: 'autoUpdate',

    // Регистрация SW — вручную в main.tsx (virtual:pwa-register), чтобы
    // пропустить её внутри Capacitor-оболочки.
    injectRegister: false,

    includeAssets: ['favicon.ico', 'icons/*.png'],

    manifest: false,

    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webm,mp4}'],
      // Страховка к dropMswWorker: воркер моков не должен попасть в precache.
      globIgnores: ['**/node_modules/**', MSW_WORKER],

      runtimeCaching: [
        {
          // VITE_API_URL везде относительный (/api), а фронт и api за nginx
          // живут на одном origin — и на app.vizhu.su, и на demo.vizhu.su, и в
          // dev. Поэтому матчим по пути, а не по домену: паттерн с захардкоженным
          // хостом не совпадал ни с одним запросом, и кэш API не работал вовсе.
          urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/api/'),
          handler: 'NetworkFirst',
          options: {
            // То же имя чистит clearApiCache() при выходе из аккаунта.
            cacheName: API_CACHE_NAME,
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 7,
            },
          },
        },
      ],
    },

    devOptions: {
      // Отключено в dev: Workbox SW конфликтует с MSW (оба регистрируются на один scope)
      enabled: false,
    },
  });

  return {
    plugins: [react(), dropMswWorker(), pwaPlugin, ...extraPlugins],

    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },

    // ─── Dev-сервер ───────────────────────────────────────────────────────
    server: {
      port: 5173,
      strictPort: false,
      open: !process.env.DOCKER_DEV,
      proxy: devProxy,
    },

    // ─── Сборка ───────────────────────────────────────────────────────────
    build: {
      target: 'es2022',
      outDir: 'dist',
      // Source maps в dev для отладки; в prod отключены (безопасность + размер:
      // в нативной сборке .map-файлы уезжали бы прямо в APK/IPA)
      sourcemap: !isProd,
      rollupOptions: {
        output: {
          // Ядро, которое нужно на старте любого экрана, — отдельным чанком для
          // долгосрочного кэширования в web: хэш меняется только при обновлении
          // библиотек. Функция, а не объект: React — CommonJS, и объектная
          // форма ловила только обёртку `react/index.js` (чанк выходил пустым,
          // а react-dom оседал в index). Остальные зависимости сюда не
          // перечисляем — их по ленивым чанкам экранов раскладывает Rollup.
          manualChunks: (id: string) => {
            if (VENDOR_CORE.test(id)) {
              return 'react-vendor';
            }
            if (VENDOR_QUERY.test(id)) {
              return 'query-vendor';
            }
            return undefined;
          },
        },
      },
    },

    // ─── SCSS ─────────────────────────────────────────────────────────────
    css: {
      preprocessorOptions: {
        scss: {
          loadPaths: [resolve(__dirname, 'src')],
        },
      },
    },

    // ─── Preview (vite preview) ───────────────────────────────────────────
    preview: {
      port: 4173,
      proxy: devProxy,
    },
  };
});
