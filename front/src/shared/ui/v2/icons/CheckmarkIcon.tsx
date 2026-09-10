import './icons.scss';

interface IconProps {
  className?: string;
}

export const CheckmarkIcon = ({ className }: IconProps) => (
  <svg
    className={['icon', className].filter(Boolean).join(' ')}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    focusable="false"
    aria-hidden="true"
  >
    <path
      d="M25 8L12.4192 23.1349C12.0364 23.5953 11.3375 23.6185 10.9251 23.1844L6 18"
      stroke="currentColor"
      strokeWidth="4"
      strokeMiterlimit="10"
      strokeLinecap="round"
    />
  </svg>
);
