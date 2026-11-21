import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentRestaurant, RestaurantGuard } from '../common/restaurant.guard';
import { Restaurant } from '../entities/restaurant.entity';
import { AssistService } from '../services/assist.service';
import { QueueQueryDto, RejectRequestDto } from '../dto/assist.dto';

/** Restaurant side: the live queue. */
@Controller('requests')
@UseGuards(RestaurantGuard)
export class RequestsController {
  constructor(private svc: AssistService) {}

  @Get() queue(@CurrentRestaurant() r: Restaurant, @Query() q: QueueQueryDto) { return this.svc.queue(r.id, q.branchId); }
  @Get('history') history(@CurrentRestaurant() r: Restaurant, @Query() q: QueueQueryDto) { return this.svc.history(r.id, q.branchId); }

  @Patch(':id/approve')
  approve(@CurrentRestaurant() r: Restaurant, @Param('id', ParseUUIDPipe) id: string) { return this.svc.approve(r.id, id); }
  @Patch(':id/bell')
  bell(@CurrentRestaurant() r: Restaurant, @Param('id', ParseUUIDPipe) id: string) { return this.svc.bell(r.id, id); }
  @Patch(':id/reject')
  reject(@CurrentRestaurant() r: Restaurant, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectRequestDto) {
    return this.svc.reject(r.id, id, dto.reason);
  }

  @Patch(':id/close')
  close(@CurrentRestaurant() r: Restaurant, @Param('id', ParseUUIDPipe) id: string) { return this.svc.close(r.id, id); }
}
