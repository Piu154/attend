import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '../entities/restaurant.entity';
import { User } from '../entities/user.entity';
import { isUniqueViolation } from '../common/crypto';
import { hashPassword, verifyPassword } from '../common/password';
import { LoginDto, OwnerSetupDto } from '../dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Restaurant) private restaurants: Repository<Restaurant>,
    private jwt: JwtService,
  ) {}

  private userView(u: User) {
    return { id: u.id, name: u.name, email: u.email, role: u.role, branchId: u.branchId };
  }
  private restaurantView(r: Restaurant) {
    return { id: r.id, name: r.name, status: r.status };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ where: { email: dto.email.toLowerCase().trim() } });
    const ok = await verifyPassword(dto.password, user?.passwordHash ?? null);
    // same message for "no such user", "wrong password" and "disabled", so nothing leaks
    if (!user || !ok || !user.isActive) throw new UnauthorizedException('Invalid email or password');
    const restaurant = await this.restaurants.findOneOrFail({ where: { id: user.restaurantId } });
    await this.users.update(user.id, { lastLoginAt: new Date() });
    const accessToken = await this.jwt.signAsync({ sub: user.id, rid: user.restaurantId, role: user.role });
    return {
      accessToken, tokenType: 'Bearer', expiresIn: '12h',
      user: this.userView(user), restaurant: this.restaurantView(restaurant),
    };
  }

  me(restaurant: Restaurant, user: User | null) {
    return {
      authMethod: user ? 'login' : 'ownerKey',
      user: user ? this.userView(user) : null,
      restaurant: this.restaurantView(restaurant),
    };
  }

  /** For restaurants registered before logins existed: the owner key creates the owner login once. */
  async setupOwner(restaurant: Restaurant, dto: OwnerSetupDto) {
    const existing = await this.users.count({ where: { restaurantId: restaurant.id } });
    if (existing > 0) throw new ConflictException('This restaurant already has accounts');
    try {
      const u = await this.users.save(this.users.create({
        restaurantId: restaurant.id, name: dto.name.trim(), email: dto.email.toLowerCase().trim(),
        passwordHash: await hashPassword(dto.password), role: 'owner',
      }));
      return { user: this.userView(u), message: 'Owner login created. Sign in with POST /api/auth/login.' };
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Email already in use');
      throw e;
    }
  }
}