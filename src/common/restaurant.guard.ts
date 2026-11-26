import {
  CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '../entities/restaurant.entity';
import { User, UserRole } from '../entities/user.entity';
import { sha256 } from './crypto';
import { ALLOW_PENDING_KEY, ROLES_KEY } from './roles.decorator';

/**
 * Accepts EITHER a login token (Authorization: Bearer ...) OR the old x-restaurant-key.
 * The old key counts as the owner role, so existing tests and tools keep working.
 */
@Injectable()
export class RestaurantGuard implements CanActivate {
  constructor(
    @InjectRepository(Restaurant) private restaurants: Repository<Restaurant>,
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers['authorization'];
    let restaurant: Restaurant | null = null;
    let user: User | null = null;
    let role: UserRole = 'owner';

    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      let payload: { sub: string };
      try {
        payload = await this.jwt.verifyAsync(auth.slice(7));
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
      user = await this.users.findOne({ where: { id: payload.sub } });
      if (!user || !user.isActive) throw new UnauthorizedException('Account disabled');
      restaurant = await this.restaurants.findOne({ where: { id: user.restaurantId } });
      role = user.role;
    } else {
      const key = req.headers['x-restaurant-key'];
      if (typeof key !== 'string' || !key) throw new UnauthorizedException('Missing credentials');
      restaurant = await this.restaurants.findOne({ where: { ownerKeyHash: sha256(key) } });
    }
    if (!restaurant) throw new UnauthorizedException('Invalid credentials');

    const targets = [ctx.getHandler(), ctx.getClass()];
    const allowPending = this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_KEY, targets);
    if (!allowPending && restaurant.status !== 'approved') {
      throw new ForbiddenException(`Restaurant is ${restaurant.status}`);
    }
    const allowedRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, targets);
    if (allowedRoles && !allowedRoles.includes(role)) throw new ForbiddenException('Your role cannot do this');

      const ownBranch = user?.branchId ?? null;
    const askedBranch = req.params?.branchId;
    if (ownBranch && askedBranch && askedBranch !== ownBranch) throw new ForbiddenException('This login belongs to another branch');
    req.branchId = ownBranch;

    req.restaurant = restaurant;
    req.user = user;
    req.role = role;
    return true;
  }
}

export const CurrentRestaurant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Restaurant => ctx.switchToHttp().getRequest().restaurant,
);

/** The logged-in user, or null when the request used the old x-restaurant-key. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): User | null => ctx.switchToHttp().getRequest().user ?? null,
);