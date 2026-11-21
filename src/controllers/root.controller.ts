import { Controller, Get } from '@nestjs/common';

@Controller()
export class RootController {
  @Get()
  home() {
    return {
      status: 'ok',
      message: 'ATTEND Backend is running successfully!',
      health: '/api/health',
    };
  }
}