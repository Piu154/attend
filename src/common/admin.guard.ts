import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { safeEqual } from './crypto';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private cfg: ConfigService) {}
  canActivate(ctx: ExecutionContext): boolean {
    const expected = this.cfg.get<string>('ADMIN_API_KEY');
    const given = ctx.switchToHttp().getRequest().headers['x-admin-key'];
    if (!expected || typeof given !== 'string' || !safeEqual(given, expected)) {
      throw new UnauthorizedException('Invalid admin key');
    }
    return true;
  }
}
