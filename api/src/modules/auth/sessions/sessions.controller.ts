import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  JwtAuthGuard,
  type JwtPayload,
} from '../../../common/guards/jwt.guard';
import { DevicePlatform, SessionClient } from './device-info';
import type { Session } from './session.entity';
import { SessionsService } from './sessions.service';

class SessionView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Pixel 7', description: 'Подпись устройства' })
  deviceName!: string;

  @ApiProperty({ enum: SessionClient, description: 'Приложение или браузер' })
  client!: SessionClient;

  @ApiProperty({ enum: DevicePlatform })
  platform!: DevicePlatform;

  @ApiProperty({ format: 'date-time', description: 'Когда вошли' })
  createdAt!: string;

  @ApiProperty({
    format: 'date-time',
    description: 'Последнее обновление токенов',
  })
  lastActiveAt!: string;
}

class SessionsListView {
  @ApiProperty({ type: SessionView, description: 'Сеанс этого устройства' })
  current!: SessionView;

  @ApiProperty({
    type: [SessionView],
    description: 'Остальные активные сеансы, свежие сверху',
  })
  others!: SessionView[];
}

class RevokeOthersView {
  @ApiProperty({ example: 2, description: 'Сколько сеансов завершено' })
  revoked!: number;
}

const toView = (s: Session): SessionView => ({
  id: s.id,
  deviceName: s.deviceName,
  client: s.client,
  platform: s.platform,
  createdAt: s.createdAt.toISOString(),
  lastActiveAt: s.lastActiveAt.toISOString(),
});

/**
 * Токен без `sid` выпущен до появления сеансов. 401 здесь — не ошибка для
 * клиента: интерсептор обновит токены (refresh заведёт сеанс) и повторит запрос.
 */
const currentSessionId = (user: JwtPayload): string => {
  if (!user.sid) throw new UnauthorizedException('Токен без сеанса');
  return user.sid;
};

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth/sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Активные сеансы аккаунта: это устройство и другие',
  })
  @ApiResponse({ status: 200, type: SessionsListView })
  @ApiResponse({ status: 401, description: 'Сеанс завершён или токен устарел' })
  async list(@CurrentUser() user: JwtPayload): Promise<SessionsListView> {
    const { current, others } = await this.sessions.list(
      user.sub,
      currentSessionId(user),
    );
    return { current: toView(current), others: others.map(toView) };
  }

  // Объявлен раньше `:id`, иначе «others» ушёл бы в ParseUUIDPipe и получил 400.
  @Delete('others')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выйти со всех устройств, кроме этого' })
  @ApiResponse({ status: 200, type: RevokeOthersView })
  async revokeOthers(
    @CurrentUser() user: JwtPayload,
  ): Promise<RevokeOthersView> {
    const revoked = await this.sessions.revokeOthers(
      user.sub,
      currentSessionId(user),
    );
    return { revoked };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Завершить один сеанс на другом устройстве' })
  @ApiResponse({ status: 204, description: 'Сеанс завершён' })
  @ApiResponse({
    status: 400,
    description: 'Это текущий сеанс — для него есть POST /auth/logout',
  })
  @ApiResponse({ status: 404, description: 'Сеанса нет или он чужой' })
  async revoke(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.sessions.revoke(user.sub, id, currentSessionId(user));
  }
}
