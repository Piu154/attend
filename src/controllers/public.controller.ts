import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TablesService } from '../services/tables.service';
import { MenuService } from '../services/menu.service';

@Controller('public')
@UseGuards(ThrottlerGuard)
export class PublicController {
  constructor(private tables: TablesService, private menu: MenuService) {}

  @Get('qr/:token') resolve(@Param('token') token: string) { return this.tables.resolveToken(token); }

  @Get('qr/:token/menu')
  async menuFor(@Param('token') token: string) {
    const info = await this.tables.resolveToken(token);
    return { ...info, menu: await this.menu.fullMenu(info.restaurant.id, true) };
  }
}
