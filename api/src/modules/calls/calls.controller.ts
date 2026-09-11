import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CallsService } from './calls.service';
import { MatchingService } from './matching.service';
import { CreateTokenDto } from './dto/create-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard'; // ← поправь путь под свой
import { JwtPayload } from '../../common/guards/jwt.guard'; // ← путь к твоему интерфейсу
import { UsersService } from '../users/users.service';

@ApiTags('calls')
@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(
    private readonly calls: CallsService,
    private readonly users: UsersService,
    private readonly matching: MatchingService,
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

  @Get('availability')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Сколько волонтёров сейчас свободны и готовы принять звонок',
  })
  @ApiResponse({ status: 200, description: '{ available: number }' })
  getAvailability(): { available: number } {
    return { available: this.matching.availableCount() };
  }
}
