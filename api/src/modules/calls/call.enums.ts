/**
 * Жизненный цикл звонка.
 *
 * - searching — запрос в очереди или идёт дозвон волонтёрам
 * - active    — волонтёр принял, стороны получили токены LiveKit
 * - finished  — комната LiveKit закрылась
 * - cancelled — незрячий ушёл (или был вычищен) до соединения
 *
 * Переходы только вперёд: searching → active → finished, либо
 * searching → cancelled. Сбой выдачи комнаты терминальным не считается —
 * матчинг возвращает запрос в очередь, и звонок остаётся в searching.
 */
export enum CallStatus {
  SEARCHING = 'searching',
  ACTIVE = 'active',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

/** Сторона звонка. Кто за ней стоит — `calls.blind_user_id` / `volunteer_user_id`. */
export enum CallSide {
  BLIND = 'blind',
  VOLUNTEER = 'volunteer',
}

/** Кто первым покинул комнату; system — закрыл сервер (таймаут, сверка). */
export enum CallEndedBy {
  BLIND = 'blind',
  VOLUNTEER = 'volunteer',
  SYSTEM = 'system',
}

/** Оценка собеседника после звонка — значения совпадают с фронтом. */
export enum CallRating {
  BAD = 'bad',
  NEUTRAL = 'neutral',
  GOOD = 'good',
}
