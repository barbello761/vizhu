import { EmailPurpose } from './email-purpose.enum';
import type { MailMessage } from './mail.service';

const COPY: Record<
  EmailPurpose,
  { subject: string; heading: string; body: string; cta: string }
> = {
  [EmailPurpose.VERIFY_EMAIL]: {
    subject: 'ВИЖУ: подтвердите электронную почту',
    heading: 'Подтвердите электронную почту',
    body: 'Этот адрес указан как резервный способ входа в ВИЖУ. Подтвердите его, чтобы не потерять доступ к аккаунту, если номер телефона окажется недоступен.',
    cta: 'Подтвердить почту',
  },
  [EmailPurpose.CHANGE_EMAIL]: {
    subject: 'ВИЖУ: подтвердите новую электронную почту',
    heading: 'Подтвердите новую электронную почту',
    body: 'Вы меняете адрес электронной почты в ВИЖУ на этот. Подтвердите его, а затем вернитесь в приложение и нажмите «Я перешёл по ссылке».',
    cta: 'Подтвердить почту',
  },
  [EmailPurpose.CHANGE_PHONE]: {
    subject: 'ВИЖУ: подтвердите смену номера телефона',
    heading: 'Подтвердите смену номера телефона',
    body: 'В вашем аккаунте ВИЖУ запрошена смена номера телефона. Подтвердите её, а затем вернитесь в приложение и нажмите «Я перешёл по ссылке».',
    cta: 'Подтвердить смену номера',
  },
  [EmailPurpose.DELETE_ACCOUNT]: {
    subject: 'ВИЖУ: подтвердите удаление аккаунта',
    heading: 'Подтвердите удаление аккаунта',
    body: 'В вашем аккаунте ВИЖУ запрошено удаление. Профиль, история запросов и настройки будут стёрты безвозвратно. Подтвердите удаление, а затем вернитесь в приложение и нажмите «Я перешёл по ссылке».',
    cta: 'Подтвердить удаление',
  },
};

const FOOTER =
  'Если это были не вы — просто не переходите по ссылке, ничего не произойдёт. Ссылка действует ограниченное время и срабатывает один раз.';

/** Экранирование для вставки в HTML — тексты свои, но ссылка собирается из токена. */
const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char] ?? char,
  );

export const buildMagicLinkMail = (
  purpose: EmailPurpose,
  to: string,
  link: string,
  expiresInMinutes: number,
): MailMessage => {
  const { subject, heading, body, cta } = COPY[purpose];
  const lifetime = `Ссылка действует ${expiresInMinutes} минут.`;

  const text = [heading, '', body, '', link, '', lifetime, FOOTER].join('\n');

  const safeLink = escapeHtml(link);
  const html = `<!doctype html>
<html lang="ru">
  <body style="margin:0;padding:24px;background:#ffffff;color:#111111;font:16px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif">
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25">${escapeHtml(heading)}</h1>
    <p style="margin:0 0 24px">${escapeHtml(body)}</p>
    <p style="margin:0 0 24px">
      <a href="${safeLink}" style="display:inline-block;padding:16px 24px;border-radius:12px;background:#1550dc;color:#ffffff;text-decoration:none;font-weight:600">${escapeHtml(cta)}</a>
    </p>
    <p style="margin:0 0 24px">Если кнопка не открывается, скопируйте адрес: <a href="${safeLink}">${safeLink}</a></p>
    <p style="margin:0;color:#555555;font-size:14px">${escapeHtml(lifetime)} ${escapeHtml(FOOTER)}</p>
  </body>
</html>`;

  return { to, subject, text, html };
};
