import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const DEFAULT_ENDPOINT = 'https://postbox.cloud.yandex.net';
const DEFAULT_REGION = 'ru-central1';
const DEFAULT_FROM = 'ВИЖУ <no-reply@vizhu.su>';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const describeSendError = (err: unknown): string => {
  const message = err instanceof Error ? err.message : String(err);
  if (typeof err !== 'object' || err === null) return message;

  const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata
    ?.httpStatusCode;
  const body = (err as { $response?: { body?: unknown } }).$response?.body;

  return [
    message,
    status !== undefined ? `HTTP ${status}` : null,
    typeof body === 'string' && body !== '' ? `тело ответа: ${body}` : null,
  ]
    .filter(Boolean)
    .join('; ');
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client: SESv2Client | null;
  private readonly from: string;
  private readonly isProduction: boolean;

  constructor(config: ConfigService) {
    const accessKeyId = config.get<string>('POSTBOX_API_KEY')?.trim();
    const secretAccessKey = config.get<string>('POSTBOX_API_SECRET')?.trim();

    this.from = config.get<string>('POSTBOX_FROM')?.trim() || DEFAULT_FROM;
    this.isProduction = config.get<string>('NODE_ENV') === 'production';

    if (!accessKeyId || !secretAccessKey) {
      this.client = null;
      // Не бросаем на старте: без ключей должен подниматься локальный dev,
      // а на проде о проблеме скажет первая же неотправленная почта.
      this.logger.warn(
        'POSTBOX_API_KEY/POSTBOX_API_SECRET не заданы — письма не отправляются',
      );
      return;
    }

    this.client = new SESv2Client({
      region: config.get<string>('POSTBOX_REGION')?.trim() || DEFAULT_REGION,
      endpoint:
        config.get<string>('POSTBOX_ENDPOINT')?.trim() || DEFAULT_ENDPOINT,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.client) {
      if (this.isProduction) {
        throw new InternalServerErrorException('Почта не настроена');
      }
      this.logger.warn(
        `Почта не настроена — письмо не отправлено.\n` +
          `  Кому: ${message.to}\n  Тема: ${message.subject}\n${message.text}`,
      );
      return;
    }

    try {
      const result = await this.client.send(
        new SendEmailCommand({
          FromEmailAddress: this.from,
          Destination: { ToAddresses: [message.to] },
          Content: {
            Simple: {
              Subject: { Data: message.subject, Charset: 'UTF-8' },
              Body: {
                Text: { Data: message.text, Charset: 'UTF-8' },
                Html: { Data: message.html, Charset: 'UTF-8' },
              },
            },
          },
        }),
      );
      this.logger.log(
        `Письмо отправлено на ${message.to}, messageId: ${result.MessageId}`,
      );
    } catch (err) {
      this.logger.error(
        `Postbox не принял письмо для ${message.to}: ${describeSendError(err)}`,
      );
      throw new InternalServerErrorException('Не удалось отправить письмо');
    }
  }
}
