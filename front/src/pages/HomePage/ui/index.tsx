import { Tile } from '@/shared/ui/v2';

import { HOME_TILES } from '../model/tiles';

import './HomePage.scss';

export const HomePage = () => (
  <ul className="home" role="list">
    {HOME_TILES.map(({ id, to, label, Icon }) => (
      <li key={id} className="home__item">
        <Tile to={to} label={label} icon={<Icon />} />
      </li>
    ))}
  </ul>
);
