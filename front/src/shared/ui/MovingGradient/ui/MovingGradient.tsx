import './MovingGradient.scss';

/**
 * Пути к фирменному градиенту. Файлы лежат в `public/assets`, а не в бандле:
 * их же по этим адресам тянет заставка в `index.html`, которая работает
 * до загрузки JS.
 */
const SOURCES = [
  { src: '/assets/moving-gradient.webm', type: 'video/webm' },
  { src: '/assets/moving-gradient.mp4', type: 'video/mp4' },
];

/**
 * Постер 1×1 в цвет подложки. Без него Android WebView секунду рисует свою
 * заглушку — белый прямоугольник с кнопкой «плей» во весь кадр.
 */
const POSTER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mNgVagHAADSAKW/j3nHAAAAAElFTkSuQmCC';

interface MovingGradientProps {
  className?: string;
}

/**
 * Фирменный «плывущий градиент» ВИЖУ — тот же шейдер, что на заставке.
 * Декоративный фон: заставка, экраны звонка, заливка кнопки «на линии».
 *
 * Всегда лежит поверх статичной CSS-подложки и проявляется только когда кадры
 * реально пошли (класс `is-playing`): если автоплей запрещён или включён
 * `prefers-reduced-motion`, остаётся статичный градиент — и это нормальный,
 * законченный вид, а не поломка.
 */
export const MovingGradient = ({ className }: MovingGradientProps) => (
  <video
    className={['moving-gradient', className].filter(Boolean).join(' ')}
    aria-hidden="true"
    tabIndex={-1}
    autoPlay
    muted
    loop
    playsInline
    preload="auto"
    disablePictureInPicture
    poster={POSTER}
    onPlaying={(event) => event.currentTarget.classList.add('is-playing')}
  >
    {SOURCES.map(({ src, type }) => (
      <source key={type} src={src} type={type} />
    ))}
  </video>
);
