import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/admin.guard';
import { AdminVenuesService } from '../services/admin-venues.service';
import { CreateBranchDto } from '../dto/dtos';
import { UpdateTableDto } from '../dto/manage.dto';
import { AdminTablesDto, CreateVenueDto, PaymentDto, UpdateVenueDto } from '../dto/admin.dto';

/** The platform owner's control panel API. Every route needs the x-admin-key header. */
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminVenuesController {
  constructor(private svc: AdminVenuesService) {}

  // venues, plans and payments
  @Get('venues') list() { return this.svc.list(); }
  @Post('venues') create(@Body() dto: CreateVenueDto) { return this.svc.create(dto); }
  @Patch('venues/:id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVenueDto) { return this.svc.update(id, dto); }
  @Patch('venues/:id/payment') payment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PaymentDto) { return this.svc.payment(id, dto); }

  // branches, tables and QR codes
  @Get('venues/:id/branches') branches(@Param('id', ParseUUIDPipe) id: string) { return this.svc.branchesOf(id); }
  @Post('venues/:id/branches') addBranch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateBranchDto) { return this.svc.addBranch(id, dto); }
  @Post('branches/:branchId/tables') addTables(@Param('branchId', ParseUUIDPipe) branchId: string, @Body() dto: AdminTablesDto) { return this.svc.addTables(branchId, dto.tableNumbers); }
  @Post('branches/:branchId/qr-sheet') sheet(@Param('branchId', ParseUUIDPipe) branchId: string) { return this.svc.sheet(branchId); }
  @Patch('tables/:tableId') updateTable(@Param('tableId', ParseUUIDPipe) tableId: string, @Body() dto: UpdateTableDto) { return this.svc.updateTable(tableId, dto); }
  @Post('tables/:tableId/qr') newQr(@Param('tableId', ParseUUIDPipe) tableId: string) { return this.svc.newQr(tableId); }
}