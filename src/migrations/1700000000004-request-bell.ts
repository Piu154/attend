import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds the "bell": the moment staff told the customer that someone will attend to them soon. */
export class RequestBell1700000000004 implements MigrationInterface {
  name = 'RequestBell1700000000004';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "assist_requests" ADD COLUMN "bellAt" timestamptz`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "assist_requests" DROP COLUMN "bellAt"`);
  }
}