import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard, JwtPayload } from '../../common/guards/jwt.guard'; // ← поправь путь под свой
import { UsersService } from '../users/users.service';
import { CallFeedbackService } from './call-feedback.service';
import { CallRating } from './call.enums';
import { CallsService } from './calls.service';
import { CreateTokenDto } from './dto/create-token.dto';
import { MatchingService } from './matching.service';

const REPORT_OTHER_MAX_LENGTH = 200;

class RateCallBody {
  @ApiProperty({ enum: CallRating, example: CallRating.GOOD })
  rating?: unknown;
}

class ReportCallBody {
  @ApiPropertyOptional({ example: false })
  notHelpful?: unknown;

  @ApiPropertyOptional({ example: true })
  rude?: unknown;

  @ApiPropertyOptional({ example: false })
  privacyIntruder?: unknown;

  @ApiPropertyOptional({
    example: 'Перебивал',
    description: `Своя причина, до ${REPORT_OTHER_MAX_LENGTH} символов`,
  })
  other?: unknown;
}

const isCallRating = (value: unknown): value is CallRating =>
  Object.values(CallRating).includes(value as CallRating);

const flag = (value: unknown, name: string): boolean => {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') {
    throw new BadRequestException(`Поле ${name} должно быть boolean`);
  }
  return value;
};

@ApiTags('calls')
@Controller('calls')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CallsController {
  constructor(
    private readonly calls: CallsService,
    private readonly users: UsersService,
    private readonly matching: MatchingService,
    private readonly feedback: CallFeedbackService,
  ) {}

  @Post('token')
  async getToken(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: CreateTokenDto,
  ) {
    await this.calls.ensureRoom(dto.room);
    const user = await this.users.getProfile(req.user.sub);
    return this.calls.createToken({
      room: dto.room,
      identity: user.uuid,
      role: user.role,
    });
  }

  // @Get('availability')
  // @ApiBearerAuth()
  // @ApiOperation({
  //   summary: 'Сколько волонтёров сейчас свободны и готовы принять звонок',
  // })
  // @ApiResponse({ status: 200, description: '{ available: number }' })
  // getAvailability(): { available: number } {
  //   return { available: this.matching.availableCount() };
  // }

  @Post(':id/rating')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Оценить собеседника по итогам звонка' })
  @ApiBody({ type: RateCallBody })
  @ApiResponse({ status: 204, description: 'Оценка сохранена' })
  @ApiResponse({ status: 400, description: 'Невалидная оценка' })
  @ApiResponse({ status: 404, description: 'Звонок не найден' })
  @ApiResponse({ status: 409, description: 'Звонок уже оценён' })
  async rate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: RateCallBody,
    @Req() req: Request & { user: JwtPayload },
  ): Promise<void> {
    const rating = body?.rating;
    if (!isCallRating(rating)) {
      throw new BadRequestException(
        `Оценка должна быть одной из: ${Object.values(CallRating).join(', ')}`,
      );
    }
    const user = await this.users.getProfile(req.user.sub);
    await this.feedback.rate(id, user.uuid, rating);
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Пожаловаться на собеседника по итогам звонка' })
  @ApiBody({ type: ReportCallBody })
  @ApiResponse({ status: 204, description: 'Жалоба принята' })
  @ApiResponse({ status: 400, description: 'Не указана ни одна причина' })
  @ApiResponse({ status: 404, description: 'Звонок не найден' })
  @ApiResponse({ status: 409, description: 'Жалоба уже отправлена' })
  async report(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ReportCallBody,
    @Req() req: Request & { user: JwtPayload },
  ): Promise<void> {
    const notHelpful = flag(body?.notHelpful, 'notHelpful');
    const rude = flag(body?.rude, 'rude');
    const privacyIntruder = flag(body?.privacyIntruder, 'privacyIntruder');

    if (body?.other !== undefined && typeof body.other !== 'string') {
      throw new BadRequestException('Поле other должно быть строкой');
    }
    const other = body?.other?.trim() || null;
    if (other && other.length > REPORT_OTHER_MAX_LENGTH) {
      throw new BadRequestException(
        `Причина длиннее ${REPORT_OTHER_MAX_LENGTH} символов`,
      );
    }
    if (!notHelpful && !rude && !privacyIntruder && !other) {
      throw new BadRequestException('Укажите хотя бы одну причину');
    }

    const user = await this.users.getProfile(req.user.sub);
    await this.feedback.report(id, user.uuid, {
      notHelpful,
      rude,
      privacyIntruder,
      other,
    });
  }
}
