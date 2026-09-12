import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistoryEntry, HistoryMessage, RequestType } from './history.entity';

export interface CreateHistoryData {
  phoneAccountId: string | null;
  type: RequestType;
  title: string;
  messages: HistoryMessage[];
}

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(HistoryEntry)
    private readonly repo: Repository<HistoryEntry>,
  ) {}

  create(data: CreateHistoryData): Promise<HistoryEntry> {
    return this.repo.save(
      this.repo.create({ ...data, lastMessageAt: new Date() }),
    );
  }

  /**
   * Список для экрана истории — свежие диалоги сверху.
   *
   * Сортировка идёт по времени последней реплики, а не по дате создания:
   * иначе запись, в которой только что продолжили разговор, оставалась бы
   * там же, где и была. COALESCE — для записей, заведённых до появления
   * `last_message_at`.
   */
  findByUser(phoneAccountId: string): Promise<HistoryEntry[]> {
    return this.repo
      .createQueryBuilder('entry')
      .where('entry.phone_account_id = :phoneAccountId', { phoneAccountId })
      .orderBy('COALESCE(entry.last_message_at, entry.created_at)', 'DESC')
      .take(50)
      .getMany();
  }

  async findOne(id: string, phoneAccountId: string): Promise<HistoryEntry> {
    const entry = await this.repo.findOne({ where: { id, phoneAccountId } });
    if (!entry) throw new NotFoundException('Запись не найдена');
    return entry;
  }

  async rename(
    id: string,
    phoneAccountId: string,
    title: string,
  ): Promise<HistoryEntry> {
    const entry = await this.findOne(id, phoneAccountId);
    entry.title = title;
    return this.repo.save(entry);
  }

  /**
   * Дописывает реплики в конец диалога.
   *
   * Чтение и запись идут в одной транзакции под `pessimistic_write`: без
   * блокировки строки две реплики, отправленные почти одновременно, прочитали
   * бы один и тот же исходный массив, и вторая затёрла бы первую.
   *
   * Условие `phoneAccountId` — заодно проверка владельца: в чужую запись
   * дописать нельзя, она просто не найдётся.
   */
  async appendMessages(
    id: string,
    phoneAccountId: string,
    messages: HistoryMessage[],
  ): Promise<void> {
    if (messages.length === 0) return;

    await this.repo.manager.transaction(async (manager) => {
      const entry = await manager.findOne(HistoryEntry, {
        where: { id, phoneAccountId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!entry) throw new NotFoundException('Запись не найдена');

      entry.messages = [...entry.messages, ...messages];
      entry.lastMessageAt = new Date();
      await manager.save(entry);
    });
  }

  async remove(id: string, phoneAccountId: string): Promise<void> {
    await this.findOne(id, phoneAccountId);
    await this.repo.delete(id);
  }
}
