import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssistRequests1700000000002 implements MigrationInterface {
  name = 'AssistRequests1700000000002';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "assist_requests" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "restaurantId" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
      "branchId" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
      "tableId" uuid NOT NULL REFERENCES "restaurant_tables"("id") ON DELETE CASCADE,
      "type" varchar NOT NULL CHECK ("type" IN ('staff','supplies','bill','other')),
      "details" text,
      "status" varchar NOT NULL DEFAULT 'pending'
        CHECK ("status" IN ('pending','approved','rejected','completed','expired')),
      "reminders" int NOT NULL DEFAULT 0,
      "remindedAt" timestamptz,
      "approvedAt" timestamptz,
      "closedAt" timestamptz,
      "rejectReason" varchar,
      "closedBy" varchar,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    // one open (pending or approved) request per table
    await q.query(`CREATE UNIQUE INDEX "uq_one_open_request_per_table" ON "assist_requests" ("tableId") WHERE "status" IN ('pending','approved')`);
    await q.query(`CREATE INDEX "idx_assist_requests_restaurant_status" ON "assist_requests" ("restaurantId","status")`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "assist_requests"`);
  }
}
