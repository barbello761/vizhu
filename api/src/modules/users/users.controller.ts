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
const EMAIL_MAX_LENGTH = 320;
const PHONE_PATTERN = /^[\d+\-()\s]+$/;
/** Тот же минимум, что и на клиенте: адрес похож на адрес. Остальное скажет письмо. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class CreateProfileBody {
  @ApiProperty({ example: 'Иван', description: 'Имя пользователя' })
  name?: unknown;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.BLIND,
    description: 'Роль пользователя — незрячий или волонтёр',
  })
  role?: unknown;

  @ApiProperty({
    required: false,
    example: 'user@example.com',
    description:
      'Резервная почта. Сохраняется неподтверждённой, письмо со ссылкой ' +
      'уходит сразу — регистрация его не ждёт',
  })
  email?: unknown;
}

class UpdateProfileBody {
  @ApiProperty({
    required: false,
    example: 'Иван',
    description: `Новое имя, от ${NAME_MIN_LENGTH} до ${NAME_MAX_LENGTH} символов`,
  })
  name?: unknown;
}

class ConfirmedActionBody {
  @ApiProperty({
    description:
      'id подтверждения из POST /email/verifications, по которому уже ' +
      'перешли по ссылке из письма',
  })
  verificationId?: unknown;
}

class DeleteProfileBody {
  @ApiProperty({
    required: false,
    description:
      'id подтверждения. Обязателен, если у аккаунта есть подтверждённая почта',
  })
  verificationId?: unknown;
}

class SendPhoneOtpBody {
  @ApiProperty({
    example: '79001234567',
    description: 'Новый номер, любой формат',
  })
  phone?: unknown;
}

class ChangePhoneBody {
  @ApiProperty({
    example: '79001234567',
    description: 'Новый номер, любой формат',
  })
  phone?: unknown;

  @ApiProperty({
    example: '1234',
    description: '4-значный код из звонка на новый номер',
  })
  code?: unknown;

  @ApiProperty({
    description: 'id подтверждения по письму (purpose=change_phone)',
  })
  verificationId?: unknown;
}

/** Значения enum'а одним списком — для проверки и для текста ошибки. */
const USER_ROLES = Object.values(UserRole) as string[];

const toProfileResponse = (profile: User) => ({
  uuid: profile.uuid,
  name: profile.name,
  role: profile.role,
  phone: profile.phoneAccount?.phone ?? null,
  email: profile.emailAccount?.email ?? null,
  // Неподтверждённая почта — не резервный вход: смену телефона и удаление
  // аккаунта ею подтвердить нельзя, и клиент должен это показывать.
  emailVerified: Boolean(profile.emailAccount?.verifiedAt),
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

const parseEmail = (email: unknown): string => {
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    throw new BadRequestException('Проверьте адрес электронной почты');
  }
  const trimmed = email.trim();
  if (trimmed.length > EMAIL_MAX_LENGTH) {
    throw new BadRequestException('Адрес почты слишком длинный');
  }
  return trimmed;
};

const parseVerificationId = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException('Подтвердите действие по ссылке из письма');
  }
  return value.trim();
};

const parsePhone = (phone: unknown): string => {
  if (typeof phone !== 'string' || !PHONE_PATTERN.test(phone)) {
    throw new BadRequestException('Неверный формат номера телефона');
  }
  return phone;
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
    const { name, role, email } = body;
    // Роль приходит из тела запроса, то есть это `unknown`: сверяем со списком
    // значений enum'а, иначе в БД уедет что угодно и упадёт уже драйвер.
    if (typeof role !== 'string' || !USER_ROLES.includes(role)) {
      throw new BadRequestException(
        `Укажите роль: ${USER_ROLES.join(' или ')}`,
      );
    }

    const profile = await this.users.createProfile(user.sub, {
      name: parseName(name),
      role: role as UserRole,
      email: email === undefined ? undefined : parseEmail(email),
    });
    return toProfileResponse(profile);
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

  @Patch('email')
  @UseGuards(jwtGuard.JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Сохранить новую почту после перехода по ссылке' })
  @ApiBody({ type: ConfirmedActionBody })
  @ApiResponse({ status: 200, description: 'Профиль обновлён' })
  @ApiResponse({ status: 400, description: 'По ссылке ещё не перешли' })
  @ApiResponse({
    status: 409,
    description: 'Почта занята или тикет уже использован',
  })
  async changeEmail(
    @CurrentUser() user: jwtGuard.JwtPayload,
    @Body() body: ConfirmedActionBody,
  ) {
    const profile = await this.users.changeEmail(
      user.sub,
      parseVerificationId(body?.verificationId),
    );
    return toProfileResponse(profile);
  }

  @Post('phone/otp')
  @UseGuards(jwtGuard.JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Запросить код звонком на НОВЫЙ номер' })
  @ApiBody({ type: SendPhoneOtpBody })
  @ApiResponse({ status: 200, description: 'Звонок инициирован' })
  @ApiResponse({ status: 400, description: 'Неверный формат номера' })
  @ApiResponse({
    status: 409,
    description: 'Номер занят или совпадает с текущим',
  })
  async sendPhoneOtp(
    @CurrentUser() user: jwtGuard.JwtPayload,
    @Body() body: SendPhoneOtpBody,
  ) {
    await this.users.sendPhoneChangeOtp(user.sub, parsePhone(body?.phone));
    return { message: 'Код отправлен' };
  }

  @Post('phone')
  @UseGuards(jwtGuard.JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Сменить номер: код с нового номера + подтверждение по письму',
  })
  @ApiBody({ type: ChangePhoneBody })
  @ApiResponse({ status: 200, description: 'Профиль обновлён' })
  @ApiResponse({
    status: 400,
    description: 'Неверный код или по ссылке не перешли',
  })
  @ApiResponse({
    status: 409,
    description: 'Номер занят или тикет уже использован',
  })
  async changePhone(
    @CurrentUser() user: jwtGuard.JwtPayload,
    @Body() body: ChangePhoneBody,
  ) {
    const { code } = body;
    if (typeof code !== 'string' || !/^\d{4}$/.test(code)) {
      throw new BadRequestException('Код должен быть 4 цифры');
    }

    const profile = await this.users.changePhone(user.sub, {
      phone: parsePhone(body?.phone),
      code,
      verificationId: parseVerificationId(body?.verificationId),
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
  @ApiBody({ type: DeleteProfileBody, required: false })
  @ApiResponse({ status: 204, description: 'Аккаунт удалён' })
  @ApiResponse({ status: 400, description: 'Нужно подтверждение по письму' })
  @ApiResponse({ status: 404, description: 'Профиль не найден' })
  async deleteProfile(
    @CurrentUser() user: jwtGuard.JwtPayload,
    @Body() body: DeleteProfileBody | undefined,
  ) {
    const verificationId =
      typeof body?.verificationId === 'string' && body.verificationId !== ''
        ? body.verificationId
        : undefined;
    await this.users.deleteProfile(user.sub, verificationId);
  }
}
