import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AssistService } from '../services/assist.service';
import { CreateRequestDto } from '../dto/assist.dto';

/** Customer side. The table is identified only by the QR token. */
@Controller('public/qr/:token/requests')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 120, ttl: 60_000 } }) // status polling every few seconds
export class AssistPublicController {
  constructor(private svc: AssistService) {}

  @Post() create(@Param('token') token: string, @Body() dto: CreateRequestDto) { return this.svc.create(token, dto); }
  @Get('current') current(@Param('token') token: string) { return this.svc.current(token); }
  @Post(':id/remind') remind(@Param('token') token: string, @Param('id', ParseUUIDPipe) id: string) { return this.svc.remind(token, id); }
  @Post(':id/complete') complete(@Param('token') token: string, @Param('id', ParseUUIDPipe) id: string) { return this.svc.complete(token, id); }
}
