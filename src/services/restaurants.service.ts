import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Restaurant, RestaurantStatus } from '../entities/restaurant.entity';
import { RestaurantSettings } from '../entities/restaurant-settings.entity';
import { User } from '../entities/user.entity';
import { isUniqueViolation, randomToken, sha256 } from '../common/crypto';
import { hashPassword } from '../common/password';
import { RegisterRestaurantDto } from '../dto/dtos';
import { UpdateRestaurantDto } from '../dto/manage.dto';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant) private repo: Repository<Restaurant>,
    @InjectRepository(RestaurantSettings) private settings: Repository<RestaurantSettings>,
    private ds: DataSource,
  ) {}

  /** Creates the restaurant, its default settings and (if a password was sent) the owner login, all or nothing. */
  async register(dto: RegisterRestaurantDto) {
    const ownerKey = randomToken();
    try {
      return await this.ds.transaction(async (m) => {
        const r = await m.save(Restaurant, m.create(Restaurant, {
          name: dto.name.trim(), email: dto.email.toLowerCase(), status: 'pending', ownerKeyHash: sha256(ownerKey),
        }));
        await m.insert(RestaurantSettings, { restaurantId: r.id });
        if (dto.password) {
          await m.save(User, m.create(User, {
            restaurantId: r.id, name: dto.ownerName?.trim() || 'Owner', email: r.email,
            passwordHash: await hashPassword(dto.password), role: 'owner',
          }));
        }
        return {
          id: r.id, name: r.name, email: r.email, status: r.status,
          ownerAccount: !!dto.password,
          ownerKey, // shown ONCE - only the hash is stored
          note: 'Save this ownerKey now. It cannot be shown again.',
        };
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Email already registered');
      throw e;
    }
  }

  async getMe(restaurantId: string) {
    const r = await this.repo.findOneOrFail({ where: { id: restaurantId } });
    const { ownerKeyHash, ...safe } = r;
    return { ...safe, settings: await this.settings.findOne({ where: { restaurantId } }) };
  }

  async updateMe(restaurantId: string, dto: UpdateRestaurantDto) {
    const r = await this.repo.findOneOrFail({ where: { id: restaurantId } });
    if (dto.timezone !== undefined) {
      try { new Intl.DateTimeFormat('en', { timeZone: dto.timezone }); }
      catch { throw new BadRequestException('Unknown timezone, for example Asia/Kolkata'); }
      r.timezone = dto.timezone;
    }
    if (dto.name !== undefined) r.name = dto.name.trim();
    if (dto.phone !== undefined) r.phone = dto.phone.trim() || null;
    if (dto.address !== undefined) r.address = dto.address.trim() || null;
    await this.repo.save(r);
    return this.getMe(restaurantId);
  }

  list(status?: string) {
    return this.repo.find({
      where: status ? { status: status as RestaurantStatus } : {},
      select: ['id', 'name', 'email', 'status', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
  }

  async setStatus(id: string, status: RestaurantStatus) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Restaurant not found');
    r.status = status;
    await this.repo.save(r);
    return { id: r.id, name: r.name, email: r.email, status: r.status };
  }
}