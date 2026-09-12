import {
  Body,
  Controller,
  Logger,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AiService, type DescribeMode } from './ai.service';
import { HistoryService } from '../history/history.service';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt.guard';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import type { RequestType } from '../history/history.entity';

interface UploadedFile {
  toBuffer(): Promise<Buffer>;
  mimetype: string;
}

interface MultipartRequest {
  file(): Promise<UploadedFile>;
  user?: JwtPayload | null;
}

type AiResponse = { text?: string; [key: string]: unknown };

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly aiService: AiService,
    private readonly historyService: HistoryService,
  ) {}

  @Post('describe')
  @UseGuards(OptionalJwtAuthGuard)
  async describe(
    @Req() req: object,
    @Query('mode') mode: DescribeMode = 'detailed',
  ): Promise<unknown> {
    const { buffer, mimetype } = await this.extractFile(req);
    const result = (await this.aiService.describeScene(
      buffer,
      mimetype,
      mode,
    )) as AiResponse;
    return this.withHistory(req, 'describe', 'Описание сцены', result);
  }

  @Post('currency')
  @UseGuards(OptionalJwtAuthGuard)
  async currency(@Req() req: object): Promise<unknown> {
    const { buffer, mimetype } = await this.extractFile(req);
    const result = (await this.aiService.recognizeCurrency(
      buffer,
      mimetype,
    )) as AiResponse;
    return this.withHistory(req, 'currency', 'Распознавание валюты', result);
  }

  @Post('ocr')
  @UseGuards(OptionalJwtAuthGuard)
  async ocr(@Req() req: object): Promise<unknown> {
    const { buffer, mimetype } = await this.extractFile(req);
    const result = (await this.aiService.extractText(
      buffer,
      mimetype,
    )) as AiResponse;
    return this.withHistory(req, 'ocr', 'Распознавание текста', result);
  }

  /**
   * Запись делает сервер, а не клиент: реплика не потеряется, если приложение
   * закроют сразу после ответа, и на неё не нужен второй запрос.
   */
  @Post('chat')
  @UseGuards(OptionalJwtAuthGuard)
  async chat(
    @Req() req: object,
    @Body('text') text: string,
    @Body('context') context?: string,
    @Body('historyId') historyId?: string,
  ): Promise<unknown> {
    const result = (await this.aiService.customChat(
      text,
      context,
    )) as AiResponse;

    const phoneAccountId = this.userId(req);
    if (historyId && phoneAccountId) {
      const now = new Date().toISOString();
      try {
        await this.historyService.appendMessages(historyId, phoneAccountId, [
          { role: 'user', text, timestamp: now },
          {
            role: 'assistant',
            text: this.responseText(result),
            timestamp: now,
          },
        ]);
      } catch (err) {
        // Ответ пользователю важнее записи в историю: показываем его в любом
        // случае, а потерю реплики оставляем в логах.
        this.logger.error(
          `Failed to append history ${historyId}: ${String(err)}`,
        );
      }
    }

    return result;
  }

  @Post('classify')
  async classify(@Body('text') text: string): Promise<unknown> {
    return this.aiService.classifyVoiceCommand(text);
  }

  @Post('stt')
  async stt(
    @Req() req: object,
    @Query('lang') lang = 'ru-RU',
  ): Promise<unknown> {
    const { buffer, mimetype } = await this.extractFile(req);
    return this.aiService.transcribeSpeech(buffer, mimetype, lang);
  }

  /**
   * Заводит запись истории под разбор снимка и возвращает ответ ИИ вместе с её
   * `historyId` — клиент передаёт его в /ai/chat, чтобы продолжение диалога
   * дописывалось в ту же запись.
   */
  private async withHistory(
    req: object,
    type: RequestType,
    userText: string,
    result: AiResponse,
  ): Promise<AiResponse> {
    const phoneAccountId = this.userId(req);
    const responseText = this.responseText(result);
    const now = new Date().toISOString();

    try {
      const entry = await this.historyService.create({
        phoneAccountId,
        type,
        title: responseText.slice(0, 200),
        messages: [
          { role: 'user', text: userText, timestamp: now },
          { role: 'assistant', text: responseText, timestamp: now },
        ],
      });
      return { ...result, historyId: entry.id };
    } catch (err) {
      this.logger.error(`Failed to save history: ${String(err)}`);
      return result;
    }
  }

  private userId(req: object): string | null {
    return (req as { user?: JwtPayload | null }).user?.sub ?? null;
  }

  private responseText(result: AiResponse): string {
    return typeof result.text === 'string'
      ? result.text
      : JSON.stringify(result);
  }

  private async extractFile(
    req: object,
  ): Promise<{ buffer: Buffer; mimetype: string }> {
    const file = await (req as MultipartRequest).file();
    const buffer = await file.toBuffer();
    return { buffer, mimetype: file.mimetype };
  }
}
