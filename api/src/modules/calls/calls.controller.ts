import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard, JwtPayload } from '../../common/guards/jwt.guard'; // ← поправь путь под свой
import { UsersService } from '../users/users.service';
import { CallsService } from './calls.service';
import { CreateTokenDto } from './dto/create-token.dto';
import { MatchingService } from './matching.service';

@ApiTags('calls')
@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(
    private readonly calls: CallsService,
    private readonly users: UsersService,
    private readonly matching: MatchingService,
  ) {}

  /**
   * Перевыпуск LiveKit-токена в комнату текущего звонка. Раньше ручка
   * выдавала токен в любую комнату по имени, а имя комнаты — `call_<requestId>`,
   * и requestId приходит волонтёру в call:incoming. Отказавшийся волонтёр мог
   * зайти в чужой звонок и смотреть камеру незрячего (лимит участников — 3).
   */
  @Post('token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Токен LiveKit в комнату активного звонка' })
  @ApiResponse({
    status: 403,
    description: 'Нет активного звонка в этой комнате',
  })
  async getToken(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: CreateTokenDto,
  ) {
    const user = await this.users.getProfile(req.user.sub);
    const match = await this.matching.getActiveMatch(user.uuid);
    if (match?.room !== dto.room) {
      throw new ForbiddenException('Нет активного звонка в этой комнате');
    }
    return this.calls.createToken({
      room: dto.room,
      identity: user.uuid,
      role: user.role,
    });
  }

  @Get('availability')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Сколько волонтёров сейчас свободны и готовы принять звонок',
  })
  @ApiResponse({ status: 200, description: '{ available: number }' })
  async getAvailability(): Promise<{ available: number }> {
    return { available: await this.matching.availableCount() };
  }
}
