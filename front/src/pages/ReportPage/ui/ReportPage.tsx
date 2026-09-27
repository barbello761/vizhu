import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { Button, Checkbox, Input } from '@/shared/ui';
import { FormScreen } from '@/widgets/FormScreen';

import { ReportSchema, type Report } from '../model/';

import './ReportPage.scss';

export const ReportPage = () => {
  const [otherChecked, setOtherChecked] = useState(false);
  const FORM_ID = 'report-form';

  const navigate = useNavigate();

  const onSubmit = (data: Report) => {
    console.log(data);
    void navigate('/report-successful');
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
      title={'Пожаловаться на волонтёра'}
      description={
        'Жалоба анонимна для волонтёра. Мы рассмотрим её и, если нарушений будет несколько, ограничим доступ волонтёру к звонкам.'
      }
      onBack={() => void navigate(-1)}
      actions={
        <Button type="submit" form={FORM_ID}>
          Отправить
        </Button>
      }
    >
      <form
        id={FORM_ID}
        className="report__form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-label={'Форма отправки жалобы на волонтера'}
      >
        <Checkbox className="report__form__checkbox" {...register('notHelpful')}>
          Не помог с задачей
        </Checkbox>
        <Checkbox
          className="report__form__checkbox"
          {...register('rude', { deps: ['notHelpful'] })}
        >
          Был груб и неуважителен
        </Checkbox>
        <Checkbox
          className="report__form__checkbox"
          {...register('privacyIntruder', { deps: ['notHelpful'] })}
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
            {...register('other', { deps: ['notHelpful'] })}
            type={'text'}
            placeholder={'Комментарий'}
            error={errors.other?.message}
          />
        )}
        {errors.notHelpful?.message && (
          <p className="input__error" role="alert">
            {errors.notHelpful.message}
          </p>
        )}
      </form>
    </FormScreen>
  );
};
