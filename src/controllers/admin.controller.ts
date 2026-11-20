import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/admin.guard';
import { RestaurantsService } from '../services/restaurants.service';
import { StatusQueryDto } from '../dto/dtos';

@Controller('admin/restaurants')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private svc: RestaurantsService) {}
  @Get() list(@Query() q: StatusQueryDto) { return this.svc.list(q.status); }
  @Patch(':id/approve') approve(@Param('id', ParseUUIDPipe) id: string) { return this.svc.setStatus(id, 'approved'); }
  @Patch(':id/reject') reject(@Param('id', ParseUUIDPipe) id: string) { return this.svc.setStatus(id, 'rejected'); }
  @Patch(':id/suspend') suspend(@Param('id', ParseUUIDPipe) id: string) { return this.svc.setStatus(id, 'suspended'); }
}
