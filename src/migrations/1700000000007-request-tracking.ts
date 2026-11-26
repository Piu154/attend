import { MigrationInterface, QueryRunner } from 'typeorm';

/** A secret tracking link per request. Only a hash of the token is stored. */
export class RequestTracking1700000000007 implements MigrationInterface {
  name = 'RequestTracking1700000000007';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "assist_requests" ADD COLUMN "trackingHash" varchar`);
    await q.query(`CREATE UNIQUE INDEX "uq_requests_tracking" ON "assist_requests" ("trackingHash") WHERE "trackingHash" IS NOT NULL`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX "uq_requests_tracking"`);
    await q.query(`ALTER TABLE "assist_requests" DROP COLUMN "trackingHash"`);
  }
}