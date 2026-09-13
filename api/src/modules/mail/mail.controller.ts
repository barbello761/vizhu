import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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

import * as jwtGuard from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MagicLinkService } from './magic-link.service';
import { EMAIL_PURPOSES, EmailPurpose } from './email-purpose.enum';

class RequestVerificationBody {
  @ApiProperty({
    enum: EmailPurpose,
    example: EmailPurpose.CHANGE_EMAIL,
    description: 'Действие, которое подтверждается письмом',
  })
  purpose?: unknown;

  @ApiProperty({
    required: false,
    example: 'user@example.com',
    description:
      'Новый адрес. Обязателен и учитывается только для change_email — ' +
      'остальные действия подтверждаются письмом на почту аккаунта',
  })
  email?: unknown;
}

class ConfirmVerificationBody {
  @ApiProperty({
    description: 'Токен из ссылки в письме (query-параметр token)',
  })
  token?: unknown;
}

@ApiTags('email')
@Controller('email/verifications')
export class MailController {
  constructor(private readonly magicLink: MagicLinkService) {}

  @Post()
  @UseGuards(jwtGuard.JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отправить письмо со ссылкой подтверждения' })
  @ApiBody({ type: RequestVerificationBody })
  @ApiResponse({ status: 201, description: '{ id, email, expiresAt }' })
  @ApiResponse({
    status: 400,
    description: 'Неизвестное действие или нет адреса',
  })
  @ApiResponse({
    status: 409,
    description: 'У аккаунта нет подтверждённой почты',
  })
  @ApiResponse({
    status: 429,
    description: 'Письмо уже отправлено минуту назад',
  })
  async request(
    @CurrentUser() user: jwtGuard.JwtPayload,
    @Body() body: RequestVerificationBody,
  ) {
    const { purpose, email } = body;
    if (typeof purpose !== 'string' || !EMAIL_PURPOSES.includes(purpose)) {
      throw new BadRequestException(
        `Укажите действие: ${EMAIL_PURPOSES.join(', ')}`,
      );
    }
    if (email !== undefined && typeof email !== 'string') {
      throw new BadRequestException('Неверный формат адреса почты');
    }

    const ticket = await this.magicLink.request({
      phoneAccountId: user.sub,
      purpose: purpose as EmailPurpose,
      email,
    });

    return {
      id: ticket.uuid,
      email: ticket.email,
      expiresAt: ticket.expiresAt,
    };
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отметить переход по ссылке из письма' })
  @ApiBody({ type: ConfirmVerificationBody })
  @ApiResponse({ status: 200, description: '{ purpose }' })
  @ApiResponse({
    status: 400,
    description: 'Ссылка недействительна или истекла',
  })
  async confirm(@Body() body: ConfirmVerificationBody) {
    const { token } = body;
    if (typeof token !== 'string' || token.trim() === '') {
      throw new BadRequestException('Ссылка недействительна');
    }
    return this.magicLink.confirm(token.trim());
  }

  @Get(':id')
  @UseGuards(jwtGuard.JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Состояние подтверждения — за этим ходит «Я перешёл по ссылке»',
  })
  @ApiResponse({
    status: 200,
    description: 'status: pending | confirmed | consumed | expired',
  })
  @ApiResponse({ status: 404, description: 'Подтверждение не найдено' })
  async status(
    @CurrentUser() user: jwtGuard.JwtPayload,
    @Param('id') id: string,
  ) {
    return this.magicLink.status(user.sub, id);
  }
}
