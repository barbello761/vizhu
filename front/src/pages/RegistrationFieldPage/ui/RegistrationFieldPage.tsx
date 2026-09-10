import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { useRegistrationStore } from '@/features/registration';
import { Button, Input } from '@/shared/ui/v2';
import { FormScreen } from '@/widgets/FormScreen';

import type { RegistrationFieldForm, RegistrationFieldStep } from '../model/steps';

import './RegistrationFieldPage.scss';

const FORM_ID = 'registration-field-form';

interface RegistrationFieldPageProps {
  step: RegistrationFieldStep;
}

export const RegistrationFieldPage = ({ step }: RegistrationFieldPageProps) => {
  const navigate = useNavigate();
  const storedValue = useRegistrationStore((s) => s[step.field]);
  const save = useRegistrationStore((s) => s[step.setter]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationFieldForm>({
    resolver: zodResolver(step.schema),
    defaultValues: { value: storedValue },
  });

  const onSubmit = ({ value }: RegistrationFieldForm) => {
    save(value);
    void navigate(step.next);
  };

  const Icon = step.icon;
  const back = step.back;

  return (
    <FormScreen
      title={step.title}
      description={step.description}
      onBack={back ? () => void navigate(back) : undefined}
      insetTop={!back}
      actions={
        <Button type="submit" form={FORM_ID}>
          Продолжить
        </Button>
      }
    >
      <form
        id={FORM_ID}
        className="registration-field__form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-label={step.formLabel}
      >
        <Input
          {...register('value')}
          label={step.label}
          type={step.inputType}
          autoComplete={step.autoComplete}
          placeholder={step.placeholder}
          startIcon={Icon && <Icon />}
          error={errors.value?.message}
        />
      </form>
    </FormScreen>
  );
};
