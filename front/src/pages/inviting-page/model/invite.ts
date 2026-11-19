/**
 * Данные приглашения. Пока моковые — заменить на ответ бэка (`GET /invite`
 * или аналог), когда появится ручка. QR-код на экране тоже строится из `INVITE_URL`.
 */
export const INVITE_URL = 'https://vizhu.app/invite/8k2Qx';

/** То же без схемы — как показывается в поле на экране. */
export const INVITE_URL_LABEL = INVITE_URL.replace(/^https?:\/\//, '');
