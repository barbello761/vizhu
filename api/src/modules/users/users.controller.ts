import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
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
import type { User } from './entities/user.entity';
import * as jwtGuard from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from './user-role.enum';

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 255;

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

class UpdateProfileBody {
  @ApiProperty({
    required: false,
    example: 'Иван',
    description: `Новое имя, от ${NAME_MIN_LENGTH} до ${NAME_MAX_LENGTH} символов`,
  })
  name?: unknown;
}

/** Значения enum'а одним списком — для проверки и для текста ошибки. */
const USER_ROLES = Object.values(UserRole) as string[];

/**
 * Плоский стабильный контракт для фронта: телефон и тип слепоты лежат
 * в связанных таблицах — отдаём их развёрнутыми, чтобы клиент не гадал.
 * Один сериализатор на GET и PATCH: ответы обязаны совпадать до поля.
 */
const toProfileResponse = (profile: User) => ({
  uuid: profile.uuid,
  name: profile.name,
  age: profile.age,
  role: profile.role,
  phone: profile.phoneAccount?.phone ?? null,
  // Почта в БД пока не хранится — поле в контракте есть, чтобы клиент
  // (экраны смены почты уже свёрстаны) не менялся при её появлении.
  email: null,
  blindnessType: profile.blindnessType
    ? { id: profile.blindnessType.id, name: profile.blindnessType.name }
    : null,
  isVerified: profile.isVerified,
  createdAt: profile.createdAt,
});

/** Общая проверка имени для POST и PATCH — правила обязаны совпадать. */
const parseName = (name: unknown): string => {
  if (typeof name !== 'string') {
    throw new BadRequestException(
      `Укажите имя (минимум ${NAME_MIN_LENGTH} символа)`,
    );
  }
  const trimmed = name.trim();
  if (trimmed.length < NAME_MIN_LENGTH) {
    throw new BadRequestException(
      `Укажите имя (минимум ${NAME_MIN_LENGTH} символа)`,
    );
  }
  if (trimmed.length > NAME_MAX_LENGTH) {
    throw new BadRequestException(`Имя длиннее ${NAME_MAX_LENGTH} символов`);
  }
  return trimmed;
};

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
    // Роль приходит из тела запроса, то есть это `unknown`: сверяем со списком
    // значений enum'а, иначе в БД уедет что угодно и упадёт уже драйвер.
    if (typeof role !== 'string' || !USER_ROLES.includes(role)) {
      throw new BadRequestException(
        `Укажите роль: ${USER_ROLES.join(' или ')}`,
      );
    }

    return this.users.createProfile(user.sub, {
      name: parseName(name),
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
    return toProfileResponse(await this.users.getProfile(user.sub));
  }

  @Patch()
  @UseGuards(jwtGuard.JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Изменить свой профиль. Отдаёт свежий профиль целиком',
  })
  @ApiBody({ type: UpdateProfileBody })
  @ApiResponse({ status: 200, description: 'Профиль обновлён' })
  @ApiResponse({ status: 400, description: 'Невалидные данные' })
  @ApiResponse({ status: 404, description: 'Профиль не найден' })
  async updateProfile(
    @CurrentUser() user: jwtGuard.JwtPayload,
    @Body() body: UpdateProfileBody,
  ) {
    // Пустой PATCH — почти наверняка ошибка клиента (опечатка в имени поля).
    // Молча отдать неизменённый профиль значит спрятать её до продакшена.
    if (body?.name === undefined) {
      throw new BadRequestException('Укажите, что нужно изменить: name');
    }

    const profile = await this.users.updateProfile(user.sub, {
      name: parseName(body.name),
    });
    return toProfileResponse(profile);
  }

  @Delete()
  @UseGuards(jwtGuard.JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Удалить свой аккаунт безвозвратно — вместе с историей и сессиями',
  })
  @ApiResponse({ status: 204, description: 'Аккаунт удалён' })
  @ApiResponse({ status: 404, description: 'Профиль не найден' })
  async deleteProfile(@CurrentUser() user: jwtGuard.JwtPayload) {
    await this.users.deleteProfile(user.sub);
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
