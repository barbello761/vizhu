import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { DevicePlatform, SessionClient } from './device-info';
import { Session } from './session.entity';
import { SessionsService } from './sessions.service';

jest.mock('uuid', () => ({ v7: () => '00000000-0000-7000-8000-000000000000' }));

const ACCOUNT = 'pa-1';

const session = (id: string, minutesAgo = 0): Session =>
  ({
    id,
    phoneAccountId: ACCOUNT,
    client: SessionClient.NATIVE,
    platform: DevicePlatform.ANDROID,
    deviceName: 'Pixel 7',
    userAgent: null,
    createdAt: new Date(),
    lastActiveAt: new Date(Date.now() - minutesAgo * 60_000),
    expiresAt: new Date(Date.now() + 86_400_000),
  }) as Session;

const setup = () => {
  const deleteBuilder = {
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ raw: [] }),
  };
  const repo = {
    create: jest.fn((data: Partial<Session>) => data),
    save: jest.fn((data: Partial<Session>) =>
      Promise.resolve({ id: 'session-new', ...data }),
    ),
    update: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(true),
    find: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn(() => deleteBuilder),
  };
  const service = new SessionsService(repo as unknown as Repository<Session>);
  const revoked: string[][] = [];
  service.revoked$.subscribe((ids) => revoked.push([...ids]));
  return { service, repo, deleteBuilder, revoked };
};

describe('SessionsService', () => {
  it('open: описывает устройство по UA и обрезает сырой UA', async () => {
    const { service, repo } = setup();
    const ua = `Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/X; wv) ${'z'.repeat(600)}`;

    await service.open(
      ACCOUNT,
      { client: SessionClient.NATIVE, userAgent: ua },
      new Date(),
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneAccountId: ACCOUNT,
        client: SessionClient.NATIVE,
        platform: DevicePlatform.ANDROID,
        deviceName: 'Pixel 7',
      }),
    );
    const saved = repo.create.mock.calls[0][0] as Session;
    expect(saved.userAgent?.length).toBe(512);
  });

  it('isActive: свежий сеанс не ходит в БД повторно', async () => {
    const { service, repo } = setup();

    await expect(service.isActive('s-1')).resolves.toBe(true);
    await expect(service.isActive('s-1')).resolves.toBe(true);
    expect(repo.exists).toHaveBeenCalledTimes(1);
  });

  it('isActive: отозванный сеанс сразу перестаёт быть активным', async () => {
    const { service, repo } = setup();
    await service.isActive('s-2');

    await service.revoke(ACCOUNT, 's-2', 's-current');
    repo.exists.mockResolvedValue(false);

    await expect(service.isActive('s-2')).resolves.toBe(false);
  });

  it('list: текущий отдельно, остальные — как пришли (свежие сверху)', async () => {
    const { service, repo } = setup();
    const rows = [
      session('s-2', 1),
      session('s-current', 5),
      session('s-3', 60),
    ];
    repo.find.mockResolvedValue(rows);

    const result = await service.list(ACCOUNT, 's-current');

    expect(result.current.id).toBe('s-current');
    expect(result.others.map((s) => s.id)).toEqual(['s-2', 's-3']);
  });

  it('list: текущего сеанса нет — 401, клиент уйдёт на вход', async () => {
    const { service, repo } = setup();
    repo.find.mockResolvedValue([session('s-2')]);

    await expect(service.list(ACCOUNT, 's-gone')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('revoke: удаляет только сеанс своего аккаунта и сообщает об отзыве', async () => {
    const { service, repo, revoked } = setup();

    await service.revoke(ACCOUNT, 's-2', 's-current');

    expect(repo.delete).toHaveBeenCalledWith({
      id: 's-2',
      phoneAccountId: ACCOUNT,
    });
    expect(revoked).toEqual([['s-2']]);
  });

  it('revoke: текущий сеанс так не завершают', async () => {
    const { service, repo } = setup();

    await expect(
      service.revoke(ACCOUNT, 's-current', 's-current'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('revoke: чужой или несуществующий сеанс — 404 без события', async () => {
    const { service, repo, revoked } = setup();
    repo.delete.mockResolvedValue({ affected: 0 });

    await expect(
      service.revoke(ACCOUNT, 's-foreign', 's-current'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(revoked).toEqual([]);
  });

  it('revokeOthers: удаляет всё, кроме текущего, и возвращает число', async () => {
    const { service, deleteBuilder, revoked } = setup();
    deleteBuilder.execute.mockResolvedValue({
      raw: [{ id: 's-2' }, { id: 's-3' }],
    });

    await expect(service.revokeOthers(ACCOUNT, 's-current')).resolves.toBe(2);

    expect(deleteBuilder.where).toHaveBeenCalledWith(
      'phone_account_id = :phoneAccountId',
      {
        phoneAccountId: ACCOUNT,
      },
    );
    expect(deleteBuilder.andWhere).toHaveBeenCalledWith('id <> :currentId', {
      currentId: 's-current',
    });
    expect(revoked).toEqual([['s-2', 's-3']]);
  });

  it('revokeOthers: других сеансов нет — 0 и без события', async () => {
    const { service, revoked } = setup();

    await expect(service.revokeOthers(ACCOUNT, 's-current')).resolves.toBe(0);
    expect(revoked).toEqual([]);
  });

  it('removeExpired: ошибка БД не роняет крон', async () => {
    const { service, repo } = setup();
    repo.delete.mockRejectedValue(new Error('db down'));

    await expect(service.removeExpired()).resolves.toBeUndefined();
  });
});
