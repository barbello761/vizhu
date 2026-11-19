import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SmsService } from '../sms/sms.service';
import { OtpCode } from './otp-code.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PhoneAccount } from '../users/entities/phone-account.entity';
import { User } from '../users/entities/user.entity';
import { RegistrationCleanupService } from './registration-cleanup.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt.guard';
import { Session } from './sessions/session.entity';
import { SessionsController } from './sessions/sessions.controller';
import { SessionsService } from './sessions/sessions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OtpCode,
      PhoneAccount,
      RefreshToken,
      Session,
      User,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController, SessionsController],
  providers: [
    AuthService,
    SmsService,
    SessionsService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RegistrationCleanupService,
  ],
  // SessionsService наружу — его требуют guard'ы, которые другие модули
  // подключают через @UseGuards, и шлюз звонков (отключение отозванных).
  exports: [
    AuthService,
    SessionsService,
    JwtModule,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
})
export class AuthModule {}
