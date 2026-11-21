import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentRestaurant, RestaurantGuard } from '../common/restaurant.guard';
import { AllowPending, Roles } from '../common/roles.decorator';
import { Restaurant } from '../entities/restaurant.entity';
import { RestaurantsService } from '../services/restaurants.service';
import { RegisterRestaurantDto } from '../dto/dtos';
import { UpdateRestaurantDto } from '../dto/manage.dto';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private svc: RestaurantsService) {}

  @Post('register')
  register(@Body() dto: RegisterRestaurantDto) { return this.svc.register(dto); }

  @Get('me')
  @UseGuards(RestaurantGuard)
  @AllowPending()
  me(@CurrentRestaurant() r: Restaurant) { return this.svc.getMe(r.id); }

  @Patch('me')
  @UseGuards(RestaurantGuard)
  @Roles('owner', 'manager')
  update(@CurrentRestaurant() r: Restaurant, @Body() dto: UpdateRestaurantDto) { return this.svc.updateMe(r.id, dto); }
}