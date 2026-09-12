import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { BlindnessType } from './entities/blindness-type.entity';
import { PhoneAccount } from './entities/phone-account.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { HistoryEntry } from '../history/history.entity';
import { UserRole } from './user-role.enum';

interface CreateProfileData {
  name: string;
  role: UserRole;
}

/** Поля, которые пользователь может поменять у себя сам (PATCH /profile). */
export interface UpdateProfileData {
  name?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(BlindnessType)
    private readonly blindnessTypeRepo: Repository<BlindnessType>,
    private readonly dataSource: DataSource,
  ) {}

  async createProfile(
    phoneAccountId: string,
    data: CreateProfileData,
  ): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { phoneAccountId } });
    if (existing) throw new ConflictException('Профиль уже существует');

    const user = this.userRepo.create({
      phoneAccountId,
      name: data.name,
      role: data.role,
      isVerified: true,
    });
    return this.userRepo.save(user);
  }

  async getProfile(phoneAccountId: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { phoneAccountId },
      relations: ['blindnessType', 'phoneAccount'],
    });
    if (!user) throw new NotFoundException('Профиль не найден');
    return user;
  }

  /**
   * Точечное обновление своих данных. Отдаёт профиль целиком (со связями),
   * чтобы клиент положил ответ прямо в кэш и не делал повторный GET.
   */
  async updateProfile(
    phoneAccountId: string,
    data: UpdateProfileData,
  ): Promise<User> {
    const user = await this.getProfile(phoneAccountId);

    if (data.name !== undefined) user.name = data.name;

    await this.userRepo.save(user);
    return this.getProfile(phoneAccountId);
  }

  /**
   * Полное удаление аккаунта: профиль, история, refresh-токены и сам
   * phone-аккаунт. Всё в одной транзакции — частично удалённый аккаунт хуже,
   * чем неудалённый: пользователь остался бы с историей без профиля.
   *
   * Порядок важен: phone_accounts удаляется последним, на него ссылаются
   * users.phone_account_id и refresh_tokens.phone_account_id.
   */
  async deleteProfile(phoneAccountId: string): Promise<void> {
    await this.getProfile(phoneAccountId);

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(HistoryEntry, { phoneAccountId });
      await manager.delete(RefreshToken, { phoneAccountId });
      await manager.delete(User, { phoneAccountId });
      await manager.delete(PhoneAccount, { uuid: phoneAccountId });
    });
  }

  /** Ищет пользователя по его первичному ключу (uuid) — используется матчингом,
   * где идентификатор участника = user.uuid, а не phoneAccountId. */
  async getByUuid(uuid: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { uuid },
      relations: ['blindnessType', 'phoneAccount'],
    });
    if (!user) throw new NotFoundException('Профиль не найден');
    return user;
  }

  async getBlindnessTypes(): Promise<BlindnessType[]> {
    return this.blindnessTypeRepo.find({ order: { id: 'ASC' } });
  }
}
