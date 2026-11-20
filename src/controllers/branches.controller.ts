import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentRestaurant, RestaurantGuard } from '../common/restaurant.guard';
import { Restaurant } from '../entities/restaurant.entity';
import { BranchesService } from '../services/branches.service';
import { CreateBranchDto } from '../dto/dtos';

@Controller('branches')
@UseGuards(RestaurantGuard)
export class BranchesController {
  constructor(private svc: BranchesService) {}
  @Post() create(@CurrentRestaurant() r: Restaurant, @Body() dto: CreateBranchDto) { return this.svc.create(r.id, dto); }
  @Get() list(@CurrentRestaurant() r: Restaurant) { return this.svc.list(r.id); }
}
