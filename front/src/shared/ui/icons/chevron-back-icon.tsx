import './icons.scss';

interface IconProps {
  className?: string;
}

export const ChevronBackIcon = ({ className }: IconProps) => (
  <svg
    className={['icon', className].filter(Boolean).join(' ')}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    focusable="false"
    aria-hidden="true"
  >
    <path
      d="M20.4998 6.99898L11.4998 15.999L20.4998 24.999"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
