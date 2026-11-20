import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "restaurants" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" varchar NOT NULL,
      "email" varchar NOT NULL UNIQUE,
      "status" varchar NOT NULL DEFAULT 'pending'
        CHECK ("status" IN ('pending','approved','rejected','suspended')),
      "ownerKeyHash" varchar NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "idx_restaurants_owner_key" ON "restaurants" ("ownerKeyHash")`);

    await q.query(`CREATE TABLE "branches" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "restaurantId" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
      "branchName" varchar NOT NULL,
      "address" varchar NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);

    await q.query(`CREATE TABLE "restaurant_tables" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "branchId" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
      "tableNumber" varchar NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      UNIQUE ("branchId", "tableNumber")
    )`);

    await q.query(`CREATE TABLE "qr_codes" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "tableId" uuid NOT NULL REFERENCES "restaurant_tables"("id") ON DELETE CASCADE,
      "tokenHash" varchar NOT NULL UNIQUE,
      "active" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "revokedAt" timestamptz
    )`);
    // one active QR per table
    await q.query(`CREATE UNIQUE INDEX "uq_one_active_qr_per_table" ON "qr_codes" ("tableId") WHERE "active" = true`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "qr_codes"`);
    await q.query(`DROP TABLE "restaurant_tables"`);
    await q.query(`DROP TABLE "branches"`);
    await q.query(`DROP TABLE "restaurants"`);
  }
}
