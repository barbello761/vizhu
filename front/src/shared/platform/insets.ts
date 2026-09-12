/**
 * Кэш системных отступов.
 *
 * `--inset-*` на `<html>` выставляет нативная часть (MainActivity, см. мост
 * `VizhuInsets`) — инлайновым стилем, уже после загрузки документа. Любая
 * перезагрузка страницы стирает этот инлайн, и до следующего сообщения от
 * системы (в `onResume` оно приходит с задержкой ~300мс) переменные откатаны
 * на `env(safe-area-inset-*)`, а в Android WebView это ноль.
 *
 * Для главного экрана такой откат заметен: `.page-layout` высотой `100dvh`,
 * нижний отступ таб-бара зависит от `--inset-bottom`, а обе плитки —
 * `flex: 1 0 0`. Пропала полоса жестов из отступа → плитки выросли → через
 * треть секунды вернулись. Это и есть «вёрстка прыгает».
 *
 * Поэтому последние известные значения лежат в localStorage, а инлайновый
 * скрипт в index.html ставит их на `<html>` ещё до первой отрисовки. Нативные
 * значения приходят следом и почти всегда совпадают — подмены не видно.
 * Устарел кэш (сменилась ориентация, другой девайс) — его молча перезапишет
 * первое же сообщение от системы.
 *
 * Ключ и формат обязаны совпадать с инлайновым скриптом в index.html.
 */

export const INSETS_STORAGE_KEY = 'vizhu:insets';

const INSET_VARS = ['--inset-top', '--inset-right', '--inset-bottom', '--inset-left'] as const;

const readCurrent = (root: HTMLElement): Record<string, string> => {
  const snapshot: Record<string, string> = {};
  for (const name of INSET_VARS) {
    const value = root.style.getPropertyValue(name);
    if (value) {
      snapshot[name] = value;
    }
  }
  return snapshot;
};

/**
 * Следит за инлайновым стилем `<html>` и складывает `--inset-*` в localStorage.
 *
 * Наблюдатель, а не опрос: значения приходят из нативного кода через
 * `evaluateJavascript`, никакого события при этом не возникает.
 */
export const initInsetsCache = (): void => {
  const root = document.documentElement;

  const save = () => {
    const snapshot = readCurrent(root);
    if (Object.keys(snapshot).length === 0) {
      return;
    }
    try {
      localStorage.setItem(INSETS_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Приватный режим или запрет на хранилище — кэш просто не работает.
    }
  };

  save();
  new MutationObserver(save).observe(root, {
    attributes: true,
    attributeFilter: ['style'],
  });
};
