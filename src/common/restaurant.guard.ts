import {
  CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '../entities/restaurant.entity';
import { sha256 } from './crypto';

@Injectable()
export class RestaurantGuard implements CanActivate {
  constructor(@InjectRepository(Restaurant) private repo: Repository<Restaurant>) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const key = req.headers['x-restaurant-key'];
    if (typeof key !== 'string' || !key) throw new UnauthorizedException('Missing x-restaurant-key');
    const restaurant = await this.repo.findOne({ where: { ownerKeyHash: sha256(key) } });
    if (!restaurant) throw new UnauthorizedException('Invalid restaurant key');
    if (restaurant.status !== 'approved') throw new ForbiddenException(`Restaurant is ${restaurant.status}`);
    req.restaurant = restaurant;
    return true;
  }
}

export const CurrentRestaurant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Restaurant => ctx.switchToHttp().getRequest().restaurant,
);
