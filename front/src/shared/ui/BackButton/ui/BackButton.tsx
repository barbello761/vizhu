import { Button } from '@/shared/ui/Button';
import { ChevronBackIcon } from '@/shared/ui/icons';

export const BackButton = ({
  onClick,
  arialabel = 'Назад',
}: {
  onClick: () => void;
  arialabel?: string;
}) => (
  <Button variant="icon" aria-label={arialabel} onClick={onClick}>
    <ChevronBackIcon />
  </Button>
);
