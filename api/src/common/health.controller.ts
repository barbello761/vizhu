import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MatchingService } from '../modules/calls/matching.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly matching: MatchingService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /** docker-compose healthcheck стучится сюда: готов ли инстанс целиком. */
  @Get()
  async check() {
    if (!(await this.matching.isStoreReady())) {
      throw new ServiceUnavailableException('Matching store is unavailable');
    }
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Пульс для клиента: «с сервером можно работать». Приложение зовёт его на
   * старте и пока показывает экран «нет соединения».
   *
   * Отдельно от GET /health: тот валится и при недоступном хранилище
   * матчинга, а без него не работают только звонки — описание фото, история и
   * профиль живы, и запирать из-за этого всё приложение нельзя. А вот без базы
   * не работает ничего, поэтому её проверяем.
   */
  @Get('ping')
  async ping() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
    return { status: 'ok' };
  }
}
