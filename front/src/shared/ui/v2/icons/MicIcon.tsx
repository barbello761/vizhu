import './icons.scss';

interface IconProps {
  className?: string;
}

export const MicIcon = ({ className }: IconProps) => (
  <svg
    className={['icon', className].filter(Boolean).join(' ')}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    focusable="false"
    aria-hidden="true"
  >
    <path
      d="M15.9999 23.0023V28.0023M11.9999 28.0023H19.9999H11.9999ZM23.9999 13.0023V15.0023C23.9999 19.4023 20.3999 23.0023 15.9999 23.0023C11.5999 23.0023 7.99994 19.4023 7.99994 15.0023V13.0023H23.9999Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16.0001 20.0023C15.3401 20.0008 14.6872 19.8666 14.08 19.6079C13.4729 19.3491 12.9239 18.9711 12.4657 18.4961C11.5277 17.5501 11.001 16.272 11.0001 14.9398V8.00231C10.9975 7.34499 11.1251 6.69366 11.3755 6.08587C11.6258 5.47809 11.994 4.92587 12.4588 4.46107C12.9236 3.99627 13.4759 3.62807 14.0836 3.3777C14.6914 3.12733 15.3428 2.99975 16.0001 3.00232C18.8038 3.00232 21.0001 5.19857 21.0001 8.00231V14.9398C21.0001 17.7311 18.757 20.0023 16.0001 20.0023Z"
      fill="currentColor"
    />
  </svg>
);
