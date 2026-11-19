import { SessionClient } from './device-info';
import type { ClientContext } from './sessions.service';

/** Ровно то, что нужно от запроса, — без привязки к типам Fastify (nodenext). */
export interface ClientRequest {
  headers?: Record<string, string | string[] | undefined>;
}

const header = (req: ClientRequest, name: string): string | undefined => {
  const value = req.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
};

/**
 * Нативный клиент (Capacitor) шлёт X-Client: native.
 * Для него refresh-токен ходит в теле запроса/ответа, а не в куке:
 * куки между capacitor://localhost и API-доменом ненадёжны, токен хранится
 * в Keychain / EncryptedSharedPreferences на устройстве.
 */
export const isNativeClient = (req: ClientRequest): boolean =>
  header(req, 'x-client') === 'native';

export const clientContextOf = (req: ClientRequest): ClientContext => ({
  client: isNativeClient(req) ? SessionClient.NATIVE : SessionClient.WEB,
  userAgent: header(req, 'user-agent'),
});
