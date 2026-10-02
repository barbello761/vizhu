import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import type z from 'zod';

import { RatingSchema, useRateCall } from '@/features/call-feedback';
import { useProfile } from '@/features/profile';
import { formatDuration, readSeconds } from '@/shared/lib/time';
import { Button, SegmentedControl, Spinner } from '@/shared/ui';
import { FormScreen } from '@/widgets/FormScreen';

import { CHOICE_OPTIONS, FORM_ID } from '../model';

import './CallEndPage.scss';

export const CallEndPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: profile, isLoading } = useProfile();
  if (!id) {
    return <Navigate to="/help" replace />;
  }
  if (isLoading || !profile) {
    return (
      <main id="main-content" className="rating rating--loading" tabIndex={-1}>
        <Spinner />
        <p role="status" aria-live="polite">
          Загружаем форму оценки…
        </p>
      </main>
    );
  }
  return <CallEndScreen callId={id} role={profile.role} />;
};

const CallEndScreen = ({ callId, role }: { callId: string; role: string }) => {
  const navigate = useNavigate();

  type RatingFormValues = z.infer<typeof RatingSchema>;

  const isBlind = role === 'blind';

  const rateCall = useRateCall(callId);

  const location = useLocation();
  const seconds = readSeconds(location.state ?? 'Ошибка')
    ? formatDuration(readSeconds(location.state)!)
    : null;

  const handleReportScreen = () => {
    void navigate(`/call/${callId}/report`);
  };
  const handleVolunteerScreen = () => {
    void navigate(`/volunteer`, { replace: true });
  };

  const onSubmit = ({ rating }: RatingFormValues) => {
    const leave = () => void navigate('/help', { replace: true });
    if (!rating) {
      leave(); // не оценил — просто уходим
      return;
    } else {
      rateCall.mutate(
        { rating },
        {
          onSuccess: () => {
            leave();
          },
        },
      );
    }
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RatingFormValues>({
    resolver: zodResolver(RatingSchema),
  });

  return (
    <div className="rating">
      <FormScreen
        title={'Звонок завершён'}
        description={seconds ? seconds : null}
        insetTop
        actions={
          <>
            <Button
              type={isBlind ? 'submit' : 'button'}
              form={isBlind ? FORM_ID : ''}
              disabled={rateCall.isPending}
              onClick={isBlind ? () => {} : handleVolunteerScreen}
            >
              Продолжить
            </Button>
            <Button type="button" onClick={handleReportScreen} variant="tertiary">
              Пожаловаться
            </Button>
          </>
        }
      >
        {isBlind && (
          <>
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
              Ваша оценка помогает нам следить за качеством волонтёров. Сам волонтёр вашу оценку не
              увидит.
            </p>
          </>
        )}
      </FormScreen>
    </div>
  );
};
