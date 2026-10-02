/**
 * Состояние аккаунта с точки зрения модерации.
 *
 * - active       — обычная работа
 * - under_review — автоматически снят с линии по жалобам, ждёт решения модератора
 * - blocked      — заблокирован модератором
 */
export enum UserStatus {
  ACTIVE = 'active',
  UNDER_REVIEW = 'under_review',
  BLOCKED = 'blocked',
}
