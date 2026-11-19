export const STORAGE_KEYS = {
  AUTH: 'vizhu-auth',
  ONBOARDING: 'vizhu-onboarding',
  REGISTRATION: 'vizhu-registration',
  THEME: 'theme-store',
  A11Y: 'a11y-settings',
  /** sessionStorage: уже перезагружались из-за пропавшего после деплоя чанка. */
  CHUNK_RELOAD: 'vizhu-chunk-reload',
} as const;
