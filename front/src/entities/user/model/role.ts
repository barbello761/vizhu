/**
 * Роль пользователя.
 *
 * Значения совпадают с enum'ом `UserRole` на бэке
 * (`api/src/modules/users/user-role.enum.ts`): роль уезжает в POST /profile
 * и приходит обратно в GET /profile — менять её на одной стороне нельзя.
 *
 * Живёт в `entities`, потому что нужна сразу трём фичам (auth, profile, calls),
 * а класть её в одну из них означало бы цикл между ними.
 */
export type UserRole = 'blind' | 'volunteer';
