import type { ComponentType } from 'react';
import { z } from 'zod';

import { emailSchema, nameSchema } from '@/features/registration';
import { MailIcon } from '@/shared/ui/v2';

export type RegistrationFieldName = 'name' | 'email';

/** Оборачивает правило поля в схему формы — одинаковый тип для всех шагов. */
const fieldForm = (value: z.ZodType<string, string>) => z.object({ value });

export type RegistrationFieldForm = z.infer<ReturnType<typeof fieldForm>>;

export interface RegistrationFieldStep {
  field: RegistrationFieldName;
  setter: 'setName' | 'setEmail';
  schema: ReturnType<typeof fieldForm>;
  title: string;
  description: string;
  label: string;
  placeholder: string;
  formLabel: string;
  inputType: 'text' | 'email';
  autoComplete: string;
  icon?: ComponentType;
  next: string;
  /** Путь кнопки «назад». Без него кнопка не рендерится, а контент сдвигается вниз. */
  back?: string;
}

export const REGISTRATION_FIELD_STEPS = {
  name: {
    field: 'name',
    setter: 'setName',
    schema: fieldForm(nameSchema),
    title: 'Как вас зовут?',
    description:
      'Нужно, чтобы обращаться к вам по имени. Данные конфиденциальны и никому не передаются',
    label: 'Имя',
    placeholder: 'Например, Ваня',
    formLabel: 'Форма ввода имени',
    inputType: 'text',
    autoComplete: 'given-name',
    next: '/registration/email',
    back: '/registration/agreements',
  },
  email: {
    field: 'email',
    setter: 'setEmail',
    schema: fieldForm(emailSchema),
    title: 'Введите электронную почту',
    description:
      'Это резервный способ входа в аккаунт — пригодится, если вы потеряете доступ к номеру телефона',
    label: 'Электронная почта',
    placeholder: 'example@mail.com',
    formLabel: 'Форма ввода электронной почты',
    inputType: 'email',
    autoComplete: 'email',
    icon: MailIcon,
    next: '/registration/ipra',
    back: '/registration/name',
  },
} satisfies Record<RegistrationFieldName, RegistrationFieldStep>;
