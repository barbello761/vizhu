import { describe, expect, it } from 'vitest';

import { emailSchema, nameSchema } from '../validation';

const errorOf = (schema: typeof nameSchema | typeof emailSchema, input: string) => {
  const result = schema.safeParse(input);
  return result.success ? null : result.error.issues[0].message;
};

describe('nameSchema', () => {
  it('принимает имя от двух символов', () => {
    expect(nameSchema.parse('Ваня')).toBe('Ваня');
  });

  it('обрезает пробелы по краям', () => {
    expect(nameSchema.parse('  Ваня  ')).toBe('Ваня');
  });

  it('отклоняет имя из одного символа сообщением из макета', () => {
    expect(errorOf(nameSchema, 'Э')).toBe('В имени должно быть минимум 2 символа');
  });

  it('отклоняет строку из одних пробелов', () => {
    expect(errorOf(nameSchema, '   ')).toBe('В имени должно быть минимум 2 символа');
  });
});

describe('emailSchema', () => {
  it('принимает корректный адрес', () => {
    expect(emailSchema.parse('some@mail.ru')).toBe('some@mail.ru');
  });

  it('обрезает пробелы по краям', () => {
    expect(emailSchema.parse(' some@mail.ru ')).toBe('some@mail.ru');
  });

  it('требует заполнить пустое поле', () => {
    expect(errorOf(emailSchema, '')).toBe('Введите электронную почту');
  });

  it('сообщает про пропущенную собаку, как в макете', () => {
    expect(errorOf(emailSchema, 'somemail.ru')).toBe('В адресе не хватает знака «@»');
  });

  it('отклоняет адрес без домена', () => {
    expect(errorOf(emailSchema, 'some@mail')).toBe('Проверьте адрес электронной почты');
  });

  it('отклоняет адрес с пробелом внутри', () => {
    expect(errorOf(emailSchema, 'so me@mail.ru')).toBe('Проверьте адрес электронной почты');
  });
});
