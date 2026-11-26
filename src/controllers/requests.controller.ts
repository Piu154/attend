import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentRestaurant, CurrentUser, RestaurantGuard } from '../common/restaurant.guard';
import { Restaurant } from '../entities/restaurant.entity';
import { User } from '../entities/user.entity';
import { AssistService } from '../services/assist.service';
import { QueueQueryDto, RejectRequestDto } from '../dto/assist.dto';

/**
 * The live request board.
 * A branch staff login only ever sees and changes ITS OWN branch. A venue-level login
 * (no branch) can look at every branch, or one with ?branchId=
 */
@Controller('requests')
@UseGuards(RestaurantGuard)
export class RequestsController {
  constructor(private svc: AssistService) {}

  @Get()
  queue(@CurrentRestaurant() r: Restaurant, @CurrentUser() u: User | null, @Query() q: QueueQueryDto) {
    return this.svc.queue(r.id, u?.branchId ?? q.branchId);
  }

  @Get('history')
  history(@CurrentRestaurant() r: Restaurant, @CurrentUser() u: User | null, @Query() q: QueueQueryDto) {
    return this.svc.history(r.id, u?.branchId ?? q.branchId);
  }

  @Patch(':id/bell')
  bell(@CurrentRestaurant() r: Restaurant, @CurrentUser() u: User | null, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.bell(r.id, id, u?.branchId ?? undefined);
  }

  @Patch(':id/approve')
  approve(@CurrentRestaurant() r: Restaurant, @CurrentUser() u: User | null, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.approve(r.id, id, u?.branchId ?? undefined, u?.id);
  }

  @Patch(':id/reject')
  reject(@CurrentRestaurant() r: Restaurant, @CurrentUser() u: User | null, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectRequestDto) {
    return this.svc.reject(r.id, id, dto.reason, u?.branchId ?? undefined);
  }

  @Patch(':id/close')
  close(@CurrentRestaurant() r: Restaurant, @CurrentUser() u: User | null, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.close(r.id, id, u?.branchId ?? undefined);
  }
}