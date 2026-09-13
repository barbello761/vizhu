import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const LEGACY_STATEMENTS = ['DROP TABLE IF EXISTS blindness_types CASCADE'];

@Injectable()
export class LegacySchemaCleanup implements OnModuleInit {
  private readonly logger = new Logger(LegacySchemaCleanup.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    for (const statement of LEGACY_STATEMENTS) {
      try {
        await this.dataSource.query(statement);
      } catch (err) {
        // Не роняем приложение: недоубранная схема мешает меньше, чем API,
        // который не поднялся.
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.error(`Не удалось выполнить «${statement}»: ${reason}`);
      }
    }
    this.logger.log('Устаревшие объекты схемы проверены');
  }
}
