import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CallFeedbackService } from './call-feedback.service';
import { CallRecordsService } from './call-records.service';
import { CallsController } from './calls.controller';
import { CallsGateway } from './calls.gateway';
import { CallsService } from './calls.service';
import { CallFeedback } from './entities/call-feedback.entity';
import { Call } from './entities/call.entity';
import { InMemoryMatchingStore } from './in-memory-matching.store';
import { LivekitWebhookController } from './livekit-webhook.controller';
import { MatchingService } from './matching.service';
import { MATCHING_STORE, type MatchingStore } from './matching.store';
import { RedisMatchingStore } from './redis-matching.store';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Call, CallFeedback]),
    AuthModule,
    UsersModule,
  ],
  controllers: [CallsController, LivekitWebhookController],
  providers: [
    CallsService,
    {
      provide: MATCHING_STORE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MatchingStore => {
        const backend = config.get<string>('MATCHING_BACKEND', 'memory');
        if (backend === 'memory') return new InMemoryMatchingStore();
        if (backend === 'redis') {
          return new RedisMatchingStore(
            config.get<string>('REDIS_URL', 'redis://redis:6379'),
          );
        }
        throw new Error(`Unknown MATCHING_BACKEND: ${backend}`);
      },
    },
    CallRecordsService,
    CallFeedbackService,
    MatchingService,
    CallsGateway,
  ],
  exports: [CallsService, MatchingService],
})
export class CallsModule {}
