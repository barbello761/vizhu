import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { BlindnessType } from './entities/blindness-type.entity';
import { UserRole } from './user-role.enum';

interface CreateProfileData {
  name: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(BlindnessType)
    private readonly blindnessTypeRepo: Repository<BlindnessType>,
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
