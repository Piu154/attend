import { Controller, Get, Header } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The page a customer lands on after scanning a table QR: http://<host>/t/<token>
 * It is the assistance request screen (web/customer.html), not a menu.
 * The page itself calls /api/public/qr/<token>/... to find the table and send requests.
 */
@Controller('t')
export class CustomerPageController {
  @Get(':token')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  page() {
    return readFileSync(join(process.cwd(), 'web', 'customer.html'), 'utf8');
  }
}