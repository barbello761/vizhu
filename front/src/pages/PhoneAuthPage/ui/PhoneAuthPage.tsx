import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';

import { authApi, formatPhone, normalizePhone, useAuthStore } from '@/features/auth';
import { announceRouteChange } from '@/shared/lib/a11y';
import { Button, CallIcon, Input } from '@/shared/ui/v2';
import { FormScreen } from '@/widgets/FormScreen';

import './PhoneAuthPage.scss';

const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, 'Введите номер телефона')
    .refine((value) => normalizePhone(value) !== null, 'В номере должно быть 11 цифр'),
});

type FormValues = z.infer<typeof phoneSchema>;

// Кнопка «Продолжить» живёт в нижней стопке, вне <form> — связываем их по id.
const FORM_ID = 'phone-auth-form';

export const PhoneAuthPage = () => {
  const navigate = useNavigate();
  const setPhone = useAuthStore((s) => s.setPhone);
  const storedPhone = useAuthStore((s) => s.phone);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: storedPhone ? formatPhone(storedPhone) : '' },
  });

  const onSubmit = async ({ phone }: FormValues) => {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      return;
    }

    try {
      await authApi.sendOtp(normalized);
      setPhone(normalized);
      void navigate('/auth/code');
    } catch (error) {
      const tooManyRequests = axios.isAxiosError(error) && error.response?.status === 429;
      setError('phone', {
        message: tooManyRequests
          ? 'Слишком много запросов. Подождите немного.'
          : 'Не удалось отправить СМС. Попробуйте позже.',
      });
    }
  };

  return (
    <FormScreen
      title="Введите номер телефона"
      description="Отправим вам СМС с кодом подтверждения"
      onBack={() => void navigate('/auth')}
      actions={
        <>
          <Button type="submit" form={FORM_ID} loading={isSubmitting}>
            Продолжить
          </Button>
          <Button
            variant="secondary"
            onClick={() => announceRouteChange('Вход через почту — функция в разработке')}
          >
            Войти через почту
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        className="phone-auth__form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-label="Форма ввода номера телефона"
      >
        <Input
          {...register('phone')}
          label="Номер телефона"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="8 (888) 888-88-88"
          startIcon={<CallIcon />}
          error={errors.phone?.message}
        />
      </form>
    </FormScreen>
  );
};
