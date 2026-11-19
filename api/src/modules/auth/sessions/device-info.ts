/** Чем клиент входит в аккаунт: нативное приложение (Capacitor) или браузер. */
export enum SessionClient {
  NATIVE = 'native',
  WEB = 'web',
}

/** Операционная система устройства — по ней клиент выбирает иконку. */
export enum DevicePlatform {
  ANDROID = 'android',
  IOS = 'ios',
  WINDOWS = 'windows',
  MACOS = 'macos',
  LINUX = 'linux',
  UNKNOWN = 'unknown',
}

export interface DeviceInfo {
  platform: DevicePlatform;
  /** Подпись для списка сеансов: «Pixel 7», «Chrome, Windows». */
  deviceName: string;
}

export const DEVICE_NAME_MAX = 120;
export const USER_AGENT_MAX = 512;

const UNKNOWN_DEVICE = 'Неизвестное устройство';

const OS_NAMES: Record<DevicePlatform, string | null> = {
  [DevicePlatform.ANDROID]: 'Android',
  [DevicePlatform.IOS]: 'iOS',
  [DevicePlatform.WINDOWS]: 'Windows',
  [DevicePlatform.MACOS]: 'macOS',
  [DevicePlatform.LINUX]: 'Linux',
  [DevicePlatform.UNKNOWN]: null,
};

/** Порядок важен: Edge, Яндекс и Opera тоже пишут о себе «Chrome», а Chrome — «Safari». */
const BROWSERS: ReadonlyArray<readonly [RegExp, string]> = [
  [/YaBrowser\//, 'Яндекс Браузер'],
  [/Edg(?:A|iOS)?\//, 'Edge'],
  [/OPR\//, 'Opera'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/(?:Firefox|FxiOS)\//, 'Firefox'],
  [/(?:Chrome|CriOS)\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

const detectPlatform = (ua: string): DevicePlatform => {
  // iOS раньше Mac: в UA iPhone тоже встречается «like Mac OS X».
  if (/iPhone|iPad|iPod/.test(ua)) return DevicePlatform.IOS;
  if (/Android/.test(ua)) return DevicePlatform.ANDROID;
  if (/Windows/.test(ua)) return DevicePlatform.WINDOWS;
  if (/Macintosh|Mac OS X/.test(ua)) return DevicePlatform.MACOS;
  if (/Linux|X11|CrOS/.test(ua)) return DevicePlatform.LINUX;
  return DevicePlatform.UNKNOWN;
};

/**
 * Модель устройства. Android WebView честно пишет её («Android 14; Pixel 7
 * Build/…»), а Chrome с урезанным UA — заглушку «K», её не показываем.
 * iOS модель не раскрывает вовсе: только iPhone / iPad.
 */
const detectModel = (ua: string, platform: DevicePlatform): string | null => {
  if (platform === DevicePlatform.IOS) {
    return /iPad/.exec(ua)?.[0] ?? /iPhone|iPod/.exec(ua)?.[0] ?? null;
  }
  if (platform !== DevicePlatform.ANDROID) return null;
  const model =
    /Android [\d.]+; (?:[a-z]{2}[-_][A-Za-z]{2}; )?([^;)]+?)(?: Build\/[^;)]*)?(?:;|\))/
      .exec(ua)?.[1]
      ?.trim();
  if (!model || model === 'K' || /^wv$/i.test(model)) return null;
  return model;
};

const detectBrowser = (ua: string): string | null =>
  BROWSERS.find(([pattern]) => pattern.test(ua))?.[1] ?? null;

/**
 * Человекочитаемое описание устройства по User-Agent.
 *
 * Разбор свой, без библиотеки: нужны только ОС, модель и браузер, а таблицы
 * ua-parser весят больше, чем весь модуль авторизации. Если что-то не
 * распознали — подпись честно говорит «Неизвестное устройство», сырой UA
 * остаётся в таблице и позволит переразобрать его позже.
 */
export const describeDevice = (
  userAgent: string | undefined,
  client: SessionClient,
): DeviceInfo => {
  const ua = userAgent ?? '';
  const platform = detectPlatform(ua);
  const os = OS_NAMES[platform];
  const model = detectModel(ua, platform);

  let deviceName: string;
  if (client === SessionClient.NATIVE) {
    // В приложении браузера нет — устройство называем моделью или системой.
    deviceName = model ?? os ?? UNKNOWN_DEVICE;
  } else {
    const browser = detectBrowser(ua);
    const where = model ?? os;
    deviceName = [browser, where].filter(Boolean).join(', ') || UNKNOWN_DEVICE;
  }

  return { platform, deviceName: deviceName.slice(0, DEVICE_NAME_MAX) };
};
