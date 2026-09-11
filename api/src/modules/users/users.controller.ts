import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Body,
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
import { UsersService } from './users.service';
import * as jwtGuard from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from './user-role.enum';

class CreateProfileBody {
  @ApiProperty({ example: 'Иван', description: 'Имя пользователя' })
  name?: unknown;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.BLIND,
    description: 'Роль пользователя — незрячий или волонтёр',
  })
  role?: unknown;
}

/** Значения enum'а одним списком — для проверки и для текста ошибки. */
const USER_ROLES = Object.values(UserRole) as string[];

@ApiTags('profile')
@Controller('profile')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @UseGuards(jwtGuard.JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Заполнить профиль (шаг после первого входа)' })
  @ApiBody({ type: CreateProfileBody })
  @ApiResponse({ status: 201, description: 'Профиль создан' })
  @ApiResponse({ status: 400, description: 'Невалидные данные' })
  @ApiResponse({ status: 409, description: 'Профиль уже существует' })
  async createProfile(
    @CurrentUser() user: jwtGuard.JwtPayload,
    @Body() body: CreateProfileBody,
  ) {
    const { name, role } = body;
    if (typeof name !== 'string' || name.trim().length < 2) {
      throw new BadRequestException('Укажите имя (минимум 2 символа)');
    }
    // Роль приходит из тела запроса, то есть это `unknown`: сверяем со списком
    // значений enum'а, иначе в БД уедет что угодно и упадёт уже драйвер.
    if (typeof role !== 'string' || !USER_ROLES.includes(role)) {
      throw new BadRequestException(
        `Укажите роль: ${USER_ROLES.join(' или ')}`,
      );
    }

    return this.users.createProfile(user.sub, {
      name: name.trim(),
      role: role as UserRole,
    });
  }

  @Get()
  @UseGuards(jwtGuard.JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Профиль текущего пользователя' })
  @ApiResponse({ status: 200, description: 'Профиль пользователя' })
  @ApiResponse({ status: 404, description: 'Профиль не найден' })
  async getProfile(@CurrentUser() user: jwtGuard.JwtPayload) {
    const profile = await this.users.getProfile(user.sub);
    // Плоский стабильный контракт для фронта: телефон и тип слепоты лежат
    // в связанных таблицах — отдаём их развёрнутыми, чтобы клиент не гадал.
    return {
      uuid: profile.uuid,
      name: profile.name,
      age: profile.age,
      role: profile.role,
      phone: profile.phoneAccount?.phone ?? null,
      blindnessType: profile.blindnessType
        ? { id: profile.blindnessType.id, name: profile.blindnessType.name }
        : null,
      isVerified: profile.isVerified,
      createdAt: profile.createdAt,
    };
  }
}

@ApiTags('blindness-types')
@Controller('blindness-types')
export class BlindnessTypesController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Список типов слепоты для выбора при регистрации' })
  @ApiResponse({ status: 200, description: 'Список типов' })
  async getAll() {
    return this.users.getBlindnessTypes();
  }
}
