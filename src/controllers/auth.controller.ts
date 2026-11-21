import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentRestaurant, CurrentUser, RestaurantGuard } from '../common/restaurant.guard';
import { AllowPending } from '../common/roles.decorator';
import { Restaurant } from '../entities/restaurant.entity';
import { User } from '../entities/user.entity';
import { AuthService } from '../services/auth.service';
import { LoginDto, OwnerSetupDto } from '../dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private svc: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // slows down password guessing
  login(@Body() dto: LoginDto) { return this.svc.login(dto); }

  @Get('me')
  @UseGuards(RestaurantGuard)
  @AllowPending()
  me(@CurrentRestaurant() r: Restaurant, @CurrentUser() u: User | null) { return this.svc.me(r, u); }

  @Post('owner')
  @UseGuards(RestaurantGuard)
  @AllowPending()
  setupOwner(@CurrentRestaurant() r: Restaurant, @Body() dto: OwnerSetupDto) { return this.svc.setupOwner(r, dto); }
}