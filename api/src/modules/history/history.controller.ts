import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiProperty,
  ApiResponse,
} from '@nestjs/swagger';
import { HistoryService } from './history.service';
import * as jwtGuard from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const TITLE_MAX_LENGTH = 255;

class RenameHistoryBody {
  @ApiProperty({
    example: 'Квитанция ЖКХ',
    description: `Новое название записи, до ${TITLE_MAX_LENGTH} символов`,
  })
  title?: unknown;
}

@ApiTags('history')
@Controller('history')
@UseGuards(jwtGuard.JwtAuthGuard)
@ApiBearerAuth()
export class HistoryController {
  constructor(private readonly history: HistoryService) {}

  @Get()
  @ApiOperation({ summary: 'История запросов текущего пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Список записей (до 50, по убыванию даты)',
  })
  findAll(@CurrentUser() user: jwtGuard.JwtPayload) {
    return this.history.findByUser(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Одна запись с полным диалогом' })
  @ApiResponse({ status: 200, description: 'HistoryEntry' })
  @ApiResponse({ status: 404, description: 'Запись не найдена' })
  findOne(@Param('id') id: string, @CurrentUser() user: jwtGuard.JwtPayload) {
    return this.history.findOne(id, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Переименовать запись' })
  @ApiBody({ type: RenameHistoryBody })
  @ApiResponse({ status: 200, description: 'HistoryEntry с новым названием' })
  @ApiResponse({ status: 400, description: 'Невалидное название' })
  @ApiResponse({ status: 404, description: 'Запись не найдена' })
  rename(
    @Param('id') id: string,
    @Body() body: RenameHistoryBody,
    @CurrentUser() user: jwtGuard.JwtPayload,
  ) {
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    if (!title) {
      throw new BadRequestException('Укажите название записи');
    }
    if (title.length > TITLE_MAX_LENGTH) {
      throw new BadRequestException(
        `Название длиннее ${TITLE_MAX_LENGTH} символов`,
      );
    }

    return this.history.rename(id, user.sub, title);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить запись' })
  @ApiResponse({ status: 204, description: 'Удалено' })
  @ApiResponse({ status: 404, description: 'Запись не найдена' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: jwtGuard.JwtPayload,
  ) {
    await this.history.remove(id, user.sub);
  }
}
