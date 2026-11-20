import { Controller, Get, Header, NotFoundException, Param, Res, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { TablesService } from '../services/tables.service';
import { MenuService } from '../services/menu.service';
import { renderMenuPage, renderNotFoundPage } from '../common/render-page';

/** The page a customer lands on after scanning the QR: /t/<token> */
@Controller('t')
@UseGuards(ThrottlerGuard)
export class CustomerPageController {
  constructor(private tables: TablesService, private menu: MenuService) {}

  @Get(':token')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async page(@Param('token') token: string, @Res({ passthrough: true }) res: Response) {
    try {
      const info = await this.tables.resolveToken(token);
      return renderMenuPage(info, await this.menu.fullMenu(info.restaurant.id, true));
    } catch (e) {
      if (e instanceof NotFoundException) {
        res.status(404);
        return renderNotFoundPage();
      }
      throw e;
    }
  }
}
