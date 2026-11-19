import { useIsVolunteer } from '@/features/profile';

import { SelfProfile } from './self-profile';
import { VolunteerSettings } from './volunteer-settings';

/**
 * Раздел «Профиль» в таб-баре. Содержимое зависит от роли:
 * - незрячий — меню с доступом, ИПРА и премиумом (`SelfProfile`);
 * - волонтёр — короткие настройки: профиль и «О приложении» (`VolunteerSettings`).
 */
export const ProfilePage = () => (useIsVolunteer() ? <VolunteerSettings /> : <SelfProfile />);
