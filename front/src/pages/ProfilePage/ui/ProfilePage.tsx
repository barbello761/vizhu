import { useIsVolunteer } from '@/features/profile';

import { SelfProfile } from './SelfProfile';
import { VolunteerSettings } from './VolunteerSettings';

/**
 * Раздел «Профиль» в таб-баре. Содержимое зависит от роли:
 * - незрячий — меню с доступом, ИПРА и премиумом (`SelfProfile`);
 * - волонтёр — короткие настройки: профиль и «О приложении» (`VolunteerSettings`).
 */
export const ProfilePage = () => (useIsVolunteer() ? <VolunteerSettings /> : <SelfProfile />);
