import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { type Report, ReportSchema, useReportCall } from '@/features/call-feedback';
import { useProfile } from '@/features/profile';
import { apiErrorMessage } from '@/shared/api';
import { Alert, Button, Checkbox, Input, Spinner, VizhuIcon } from '@/shared/ui';
import { FormScreen } from '@/widgets/FormScreen';

import './ReportPage.scss';

export const ReportPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: profile, isLoading } = useProfile();
  if (!id) {
    return <Navigate to="/help" replace />;
  }
  if (isLoading || !profile) {
    return (
      <main id="main-content" className="report report--loading" tabIndex={-1}>
        <Spinner />
        <p role="status" aria-live="polite">
          Загружаем форму жалобы…
        </p>
      </main>
    );
  }
  return <ReportScreen callId={id} role={profile.role} />;
};

export const ReportScreen = ({ callId, role }: { callId: string; role: string }) => {
  const [otherChecked, setOtherChecked] = useState(false);
  const FORM_ID = 'report-form';

  const navigate = useNavigate();

  const reportCall = useReportCall(callId);

  const isBlind = role === 'blind';

  const onSubmit = (data: Report) => {
    reportCall.mutate(data, {
      onSuccess: () => navigate('/report-successful', { replace: true }),
    });
  };

  const {
    register,
    unregister,
    handleSubmit,
    formState: { errors },
  } = useForm<Report>({
    resolver: zodResolver(ReportSchema),
    defaultValues: { notHelpful: false, rude: false, privacyIntruder: false, other: '' },
  });

  return (
    <FormScreen
      title={`Пожаловаться на ${isBlind ? 'волонтёра' : 'незрячего'}`}
      description={`Жалоба анонимна для ${isBlind ? 'волонтёра' : 'незрячего'}. Мы рассмотрим её и, если нарушений будет несколько, ${isBlind ? 'ограничим доступ волонтёру к звонкам' : 'примем в отношении незрячего соответствующие меры'}.`}
      onBack={() => void navigate(-1)}
      actions={
        <Button type="submit" form={FORM_ID} disabled={reportCall.isPending}>
          Отправить
        </Button>
      }
    >
      <form
        id={FORM_ID}
        className="report__form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-label={`Форма отправки жалобы на ${isBlind ? 'волонтёра' : 'незрячего'}`}
      >
        {isBlind && (
          <Checkbox
            className="report__form__checkbox"
            {...register('notHelpful', { deps: ['rude'] })}
          >
            Не помог с задачей
          </Checkbox>
        )}
        <Checkbox className="report__form__checkbox" {...register('rude')}>
          Был груб и неуважителен
        </Checkbox>
        <Checkbox
          className="report__form__checkbox"
          {...register('privacyIntruder', { deps: ['rude'] })}
        >
          Нарушил мою приватность
        </Checkbox>
        <Checkbox
          className="report__form__checkbox"
          checked={otherChecked}
          onChange={(event) => {
            setOtherChecked(event.target.checked);
            unregister('other');
          }}
        >
          Другое
        </Checkbox>
        {otherChecked && (
          <Input
            className="report__form__input"
            {...register('other', { deps: ['rude'] })}
            type={'text'}
            placeholder={'Комментарий'}
            error={errors.other?.message}
          />
        )}
        {errors.rude?.message && (
          <p className="input__error" role="alert">
            {errors.rude.message}
          </p>
        )}
        {reportCall.isError && (
          <Alert icon={<VizhuIcon />}>
            {apiErrorMessage(reportCall.error, 'Ошибка отправки жалобы!')}
          </Alert>
        )}
      </form>
    </FormScreen>
  );
};
