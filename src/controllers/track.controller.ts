import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AssistService } from '../services/assist.service';

/** The customer's secret tracking link: /api/public/track/<token>. No login, no QR needed. */
@Controller('public/track/:token')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 120, ttl: 60_000 } })
export class TrackController {
  constructor(private svc: AssistService) {}

  @Get() track(@Param('token') token: string) { return this.svc.track(token); }
  @Post('raise') raise(@Param('token') token: string) { return this.svc.trackRaise(token); }
  @Post('complete') complete(@Param('token') token: string) { return this.svc.trackComplete(token); }
}