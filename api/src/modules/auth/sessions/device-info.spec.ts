import { describeDevice, DevicePlatform, SessionClient } from './device-info';

const UA = {
  androidWebView:
    'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A.240205.004; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.6261.119 Mobile Safari/537.36',
  androidReducedChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  samsungBrowser:
    'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
  iosWebView:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  iosSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  windowsEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  macYandex:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 YaBrowser/24.4.0.0 Safari/537.36',
  linuxFirefox:
    'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
};

describe('describeDevice', () => {
  it.each([
    [UA.androidWebView, DevicePlatform.ANDROID, 'Pixel 7'],
    [UA.iosWebView, DevicePlatform.IOS, 'iPhone'],
    [UA.androidReducedChrome, DevicePlatform.ANDROID, 'Android'],
  ])('приложение: устройство по модели или системе', (ua, platform, name) => {
    expect(describeDevice(ua, SessionClient.NATIVE)).toEqual({
      platform,
      deviceName: name,
    });
  });

  it.each([
    [UA.androidReducedChrome, DevicePlatform.ANDROID, 'Chrome, Android'],
    [UA.samsungBrowser, DevicePlatform.ANDROID, 'Samsung Internet, SM-S918B'],
    [UA.iosSafari, DevicePlatform.IOS, 'Safari, iPhone'],
    [UA.ipad, DevicePlatform.IOS, 'Safari, iPad'],
    [UA.windowsEdge, DevicePlatform.WINDOWS, 'Edge, Windows'],
    [UA.macYandex, DevicePlatform.MACOS, 'Яндекс Браузер, macOS'],
    [UA.linuxFirefox, DevicePlatform.LINUX, 'Firefox, Linux'],
  ])('браузер: «браузер, устройство» — %s', (ua, platform, name) => {
    expect(describeDevice(ua, SessionClient.WEB)).toEqual({
      platform,
      deviceName: name,
    });
  });

  it('без UA — честное «неизвестное устройство»', () => {
    expect(describeDevice(undefined, SessionClient.WEB)).toEqual({
      platform: DevicePlatform.UNKNOWN,
      deviceName: 'Неизвестное устройство',
    });
    expect(describeDevice('', SessionClient.NATIVE).deviceName).toBe(
      'Неизвестное устройство',
    );
  });

  it('обрезает подпись до размера колонки', () => {
    const ua = `Mozilla/5.0 (Linux; Android 14; ${'X'.repeat(300)}) Chrome/1`;
    expect(
      describeDevice(ua, SessionClient.NATIVE).deviceName.length,
    ).toBeLessThanOrEqual(120);
  });
});
