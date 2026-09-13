import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { EmailAccount } from '../users/entities/email-account.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { EmailAccountsService } from './email-accounts.service';
import { MagicLinkService } from './magic-link.service';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([EmailVerification, EmailAccount, User]),
    AuthModule,
  ],
  controllers: [MailController],
  providers: [MailService, EmailAccountsService, MagicLinkService],
  exports: [MailService, EmailAccountsService, MagicLinkService],
})
export class MailModule {}
