import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** GET /api/health  - quick proof that the app can talk to the database. */
@Controller('health')
export class HealthController {
  constructor(private ds: DataSource) {}

  @Get()
  async check() {
    const [{ now }] = await this.ds.query('SELECT now() AS now');
    const [{ n: tables }] = await this.ds.query(
      `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`);
    const [{ n: migrations }] = await this.ds.query(`SELECT count(*)::int AS n FROM migrations`);
    return { status: 'ok', database: 'up', serverTime: now, tables, migrationsApplied: migrations };
  }
}