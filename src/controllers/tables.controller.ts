import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentRestaurant, RestaurantGuard } from '../common/restaurant.guard';
import { Roles } from '../common/roles.decorator';
import { Restaurant } from '../entities/restaurant.entity';
import { TablesService } from '../services/tables.service';
import { CreateTableDto, FormatQueryDto } from '../dto/dtos';
import { UpdateTableDto } from '../dto/manage.dto';

@Controller()
@UseGuards(RestaurantGuard)
export class TablesController {
  constructor(private svc: TablesService) {}

  @Post('branches/:branchId/tables') @Roles('owner', 'manager')
  create(@CurrentRestaurant() r: Restaurant, @Param('branchId', ParseUUIDPipe) branchId: string, @Body() dto: CreateTableDto) {
    return this.svc.createTable(r.id, branchId, dto.tableNumber);
  }

  @Get('branches/:branchId/tables')
  list(@CurrentRestaurant() r: Restaurant, @Param('branchId', ParseUUIDPipe) branchId: string) {
    return this.svc.listTables(r.id, branchId);
  }

  @Patch('tables/:tableId') @Roles('owner', 'manager')
  update(@CurrentRestaurant() r: Restaurant, @Param('tableId', ParseUUIDPipe) tableId: string, @Body() dto: UpdateTableDto) {
    return this.svc.updateTable(r.id, tableId, dto);
  }

  @Post('tables/:tableId/qr/regenerate') @Roles('owner', 'manager')
  async regenerate(
    @CurrentRestaurant() r: Restaurant,
    @Param('tableId', ParseUUIDPipe) tableId: string,
    @Query() q: FormatQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (q.format === 'png') {
      const { table, url } = await this.svc.regenerateQr(r.id, tableId);
      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="table-${table.tableNumber}.png"`,
        'Cache-Control': 'no-store',
      });
      return new StreamableFile(await this.svc.png(url));
    }
    return this.svc.regenerateJson(r.id, tableId);
  }
}