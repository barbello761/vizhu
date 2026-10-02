/**
 * Имя LiveKit-комнаты однозначно выводится из id звонка (он же requestId
 * матчинга) и обратно — поэтому в `calls` имя комнаты не хранится, а вебхуки
 * LiveKit находят звонок по имени комнаты без дополнительных таблиц.
 */
const ROOM_PREFIX = 'call_';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const roomForCall = (callId: string): string =>
  `${ROOM_PREFIX}${callId}`;

/** undefined — комната не наша (например, выдана ручкой /calls/token). */
export const callIdFromRoom = (room: string): string | undefined => {
  if (!room.startsWith(ROOM_PREFIX)) return undefined;
  const id = room.slice(ROOM_PREFIX.length);
  return UUID_RE.test(id) ? id : undefined;
};
