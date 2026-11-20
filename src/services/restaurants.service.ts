import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant, RestaurantStatus } from '../entities/restaurant.entity';
import { isUniqueViolation, randomToken, sha256 } from '../common/crypto';
import { RegisterRestaurantDto } from '../dto/dtos';

@Injectable()
export class RestaurantsService {
  constructor(@InjectRepository(Restaurant) private repo: Repository<Restaurant>) {}

  async register(dto: RegisterRestaurantDto) {
    const ownerKey = randomToken();
    try {
      const r = await this.repo.save(
        this.repo.create({
          name: dto.name.trim(),
          email: dto.email.toLowerCase(),
          status: 'pending',
          ownerKeyHash: sha256(ownerKey),
        }),
      );
      return {
        id: r.id, name: r.name, email: r.email, status: r.status,
        ownerKey, // shown ONCE - only the hash is stored
        note: 'Save this ownerKey now. It cannot be shown again.',
      };
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Email already registered');
      throw e;
    }
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
