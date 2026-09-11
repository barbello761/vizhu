import { StatusBar, Style } from '@capacitor/status-bar';

import { getPlatformName, isNativePlatform } from './detect';

type ResolvedTheme = 'light' | 'dark';

/** Цвет плашки статус-бара под тему — совпадает с --bg-page из tokens.css. */
const BACKGROUND: Record<ResolvedTheme, string> = {
  light: '#ffffff',
  dark: '#16171f',
};

/**
 * Приводит системный статус-бар в соответствие с темой приложения.
 *
 * На части Android-прошивок (MIUI/HyperOS на Poco и др.) статус-бар без явно
 * заданного цвета остаётся прозрачным — контент приложения «залезает» под него
 * или, наоборот, полоса выглядит съеденной. Поэтому при каждом старте и смене
 * темы явно задаём и цвет фона (Android), и стиль текста иконок.
 *
 * `Style.Light` = тёмный текст (для светлого фона), `Style.Dark` = светлый текст.
 * На web и при неинициализированном плагине — тихий no-op.
 */
export const syncStatusBar = async (theme: ResolvedTheme): Promise<void> => {
  if (!isNativePlatform()) {
    return;
  }
  try {
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
    // setBackgroundColor реализован только на Android; на iOS плагин его отклоняет.
    if (getPlatformName() === 'android') {
      await StatusBar.setBackgroundColor({ color: BACKGROUND[theme] });
    }
  } catch (error) {
    console.error('[status-bar] не удалось применить тему к статус-бару', error);
  }
};
