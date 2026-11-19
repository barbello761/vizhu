/** Значения обязаны совпадать с api/src/modules/auth/sessions/device-info.ts. */
export type SessionClient = 'native' | 'web';

export type DevicePlatform = 'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'unknown';

/** GET /auth/sessions — один вход в аккаунт с одного устройства. */
export interface Session {
  id: string;
  /** Подпись устройства, собранная бэком из User-Agent: «Pixel 7», «Chrome, Windows». */
  deviceName: string;
  client: SessionClient;
  platform: DevicePlatform;
  /** ISO: когда вошли. */
  createdAt: string;
  /** ISO: последнее обновление токенов (запуск приложения или ~каждые 15 минут работы). */
  lastActiveAt: string;
}

export interface SessionsResponse {
  /** Сеанс этого устройства. */
  current: Session;
  /** Остальные активные сеансы, свежие сверху. */
  others: Session[];
}

/** DELETE /auth/sessions/others */
export interface RevokeOthersResponse {
  revoked: number;
}
