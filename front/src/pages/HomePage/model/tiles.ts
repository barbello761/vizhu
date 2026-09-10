import { type ComponentType } from 'react';

import { EyeIcon, TextIcon } from '@/shared/ui/v2';

export interface HomeTile {
  id: string;
  to: string;
  /** Перенос строки взят из макета — подпись в тайле всегда в две строки. */
  label: string;
  Icon: ComponentType;
}

export const HOME_TILES: HomeTile[] = [
  {
    id: 'describe',
    to: '/camera?mode=describe',
    label: 'Описать\nокружение',
    Icon: EyeIcon,
  },
  {
    id: 'ocr',
    to: '/camera?mode=ocr',
    label: 'Прочитать\nтекст',
    Icon: TextIcon,
  },
];
