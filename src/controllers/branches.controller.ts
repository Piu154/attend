import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentRestaurant, CurrentUser, RestaurantGuard } from '../common/restaurant.guard';
import { Roles } from '../common/roles.decorator';
import { Restaurant } from '../entities/restaurant.entity';
import { BranchesService } from '../services/branches.service';
import { CreateBranchDto } from '../dto/dtos';
import { UpdateBranchDto } from '../dto/manage.dto';
import { User } from '../entities/user.entity';

@Controller('branches')
@UseGuards(RestaurantGuard)
export class BranchesController {
  constructor(private svc: BranchesService) {}

  @Post() @Roles('owner', 'manager')
  create(@CurrentRestaurant() r: Restaurant, @Body() dto: CreateBranchDto) { return this.svc.create(r.id, dto); }

  @Get()
  list(@CurrentRestaurant() r: Restaurant, @CurrentUser() u: User | null) { return this.svc.list(r.id, u?.branchId ?? undefined); }

  @Patch(':id') @Roles('owner', 'manager')
  update(@CurrentRestaurant() r: Restaurant, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBranchDto) {
    return this.svc.update(r.id, id, dto);
  }
}