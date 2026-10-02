import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { WebhookEvent } from 'livekit-server-sdk';
import { CallRecordsService } from './call-records.service';
import { callIdFromRoom } from './call-room';
import { CallsService } from './calls.service';

/**
 * Приёмник вебхуков LiveKit. Без JWT-гарда: вместо него LiveKit подписывает
 * тело ключом API, и подпись проверяется в CallsService.receiveWebhook.
 *
 * Тело приходит как `application/webhook+json` и нужно строкой — подпись
 * считается от исходных байтов (парсер зарегистрирован в main.ts).
 */
@ApiExcludeController()
@Controller('calls/livekit')
export class LivekitWebhookController {
  private readonly logger = new Logger(LivekitWebhookController.name);

  constructor(
    private readonly calls: CallsService,
    private readonly records: CallRecordsService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ): Promise<void> {
    if (typeof body !== 'string') {
      throw new BadRequestException('Ожидается application/webhook+json');
    }
    let event: WebhookEvent;
    try {
      event = await this.calls.receiveWebhook(body, authorization);
    } catch {
      throw new UnauthorizedException('Неверная подпись вебхука');
    }

    const callId = callIdFromRoom(event.room?.name ?? '');
    if (!callId) return;
    const identity = event.participant?.identity;

    switch (event.event) {
      case 'participant_joined':
        if (identity) await this.records.participantJoined(callId, identity);
        break;
      case 'participant_left':
        if (identity) await this.records.participantLeft(callId, identity);
        break;
      case 'room_finished':
        await this.records.finish(callId);
        this.logger.log(`call finished: ${callId}`);
        break;
    }
  }
}
