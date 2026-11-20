import { Body, Controller, Post } from '@nestjs/common';
import { RestaurantsService } from '../services/restaurants.service';
import { RegisterRestaurantDto } from '../dto/dtos';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private svc: RestaurantsService) {}
  @Post('register')
  register(@Body() dto: RegisterRestaurantDto) { return this.svc.register(dto); }
}
