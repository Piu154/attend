import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/admin.guard';
import { AdminStaffService } from '../services/admin-staff.service';
import { StaffActiveDto } from '../dto/staff.dto';

/** Branch staff logins. Every route needs the x-admin-key header. */
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminStaffController {
  constructor(private svc: AdminStaffService) {}

  @Get('venues/:id/staff') list(@Param('id', ParseUUIDPipe) id: string) { return this.svc.listForVenue(id); }
  @Post('branches/:branchId/staff') create(@Param('branchId', ParseUUIDPipe) branchId: string) { return this.svc.create(branchId); }
  @Post('branches/:branchId/staff/reset') reset(@Param('branchId', ParseUUIDPipe) branchId: string) { return this.svc.reset(branchId); }
  @Patch('branches/:branchId/staff') setActive(@Param('branchId', ParseUUIDPipe) branchId: string, @Body() dto: StaffActiveDto) { return this.svc.setActive(branchId, dto.isActive); }
}