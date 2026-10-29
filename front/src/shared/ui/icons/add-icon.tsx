import './icons.scss';

interface IconProps {
  className?: string;
}

export const AddIcon = ({ className }: IconProps) => (
  <svg
    className={['icon', className].filter(Boolean).join(' ')}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    focusable="false"
    aria-hidden="true"
  >
    <path
      d="M16 4.99866V26.9987M27 15.9987H5.00001"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
