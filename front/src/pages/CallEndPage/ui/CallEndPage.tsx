import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import type z from 'zod';

import { Button, SegmentedControl } from '@/shared/ui';
import { FormScreen } from '@/widgets/FormScreen';

import { CHOICE_OPTIONS, FORM_ID, RatingSchema, type Rating } from '../model';
import './CallEndPage.scss';

export const CallEndPage = () => {

  const navigate = useNavigate();

  const handleReportScreen = () => {
    navigate('/call/report');
  };

  const onSubmit = (data: Rating) => {
    console.log(data);
    void navigate('/help');
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof RatingSchema>>({
    resolver: zodResolver(RatingSchema),
    defaultValues: { rating: 'neutral' },
  });

  return (
    <div className="rating">
      <FormScreen
        title={'Звонок завершён'}
        description={'4 минуты 36 секунд'}
        insetTop
        actions={
          <>
            <Button type="submit" form={FORM_ID}>
              Продолжить
            </Button>
            <Button type="button" onClick={handleReportScreen} variant="tertiary">
              Пожаловаться
            </Button>
          </>
        }
      >
        <form
          id={FORM_ID}
          className="rating__form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label={'Форма оценки волонтера'}
        >
          <p>Оцените помощь волонтера</p>
          <Controller
            control={control}
            name="rating"
            render={({ field }) => (
              <SegmentedControl
                aria-label="Выбор оценки"
                options={CHOICE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                className="profile-menu__theme"
              />
            )}
          />

          {errors.rating?.message && (
            <p className="input__error" role="alert">
              {errors.rating.message}
            </p>
          )}
        </form>
        <p>
          Ваша оценка помогает нам следить за качеством волонтёров. Сам волонтёр вашу оценку не
          увидит.
        </p>
      </FormScreen>
    </div>
  );
};
