import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BlindnessType } from './entities/blindness-type.entity';

// Без этих данных не проходится второй шаг регистрации, а synchronize
// создаёт таблицу пустой. Заполняем только пустую: на боевой базе
// формулировки могут отличаться, и дополнение дало бы дубли по смыслу.
const BLINDNESS_TYPES = [
  'Незрячий',
  'Плохое зрение',
  'Помогаю близкому',
  'Другое',
];

@Injectable()
export class BlindnessTypesSeeder implements OnModuleInit {
  private readonly logger = new Logger(BlindnessTypesSeeder.name);

  constructor(
    @InjectRepository(BlindnessType)
    private readonly repo: Repository<BlindnessType>,
  ) {}

  async onModuleInit(): Promise<void> {
    if ((await this.repo.count()) > 0) return;

    await this.repo.save(
      BLINDNESS_TYPES.map((name) => this.repo.create({ name })),
    );
    this.logger.log(
      `Справочник типов зрения был пуст — заполнен: ${BLINDNESS_TYPES.join(', ')}`,
    );
  }
}
