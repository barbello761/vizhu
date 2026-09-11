import react from '@vitejs/plugin-react-swc';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // Зеркалим пути из tsconfig.app.json
      '@': resolve(__dirname, './src'),
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [resolve(__dirname, 'src')],
      },
    },
  },

  test: {
    // jsdom эмулирует браузерное окружение для компонентных тестов
    environment: 'jsdom',

    // shared/config/env.ts валидирует переменные окружения на импорте и падает
    // без VITE_API_URL. В тестах .env не подхватывается, поэтому любой модуль,
    // который тянет config (а через createPersistedStore — почти любой стор),
    // ронял весь сьют. Адрес фиктивный: запросы всё равно перехватывает MSW.
    env: {
      VITE_API_URL: 'http://localhost:3000/api',
    },

    // Setup-файл запускается перед каждым тест-файлом (jest-dom матчеры + MSW-сервер)
    setupFiles: ['./src/tests/setup.ts'],

    // Глобалы Vitest (describe, it, expect и т.д.) доступны без импортов
    globals: true,

    css: true,

    // Покрытие кода
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/tests/**',
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/app/main.tsx',
        'src/shared/api/mocks/**',
        'src/vite-env.d.ts',
      ],
    },
  },
});
