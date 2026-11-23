import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Step 1 of the platform upgrade. Everything here ADDS to the database, so your existing
 * restaurants, tables, QR codes and requests keep working exactly as before.
 *  - venue mode (RESTAURANT / MALL_FOOD_COURT), plan tier and URL slugs
 *  - vendors (food court stalls) and a vendor login role
 *  - request routing (staff / housekeeping / vendor), bell counter, one open request per target
 *  - manual payment tracking on the venue, and "request a change" tickets
 *
 * down() only works BEFORE the mall features are used (it cannot undo stall logins or several open
 * requests on one table). After that, restore from a backup instead.
 */
export class PlatformUpgrade1700000000005 implements MigrationInterface {
  name = 'PlatformUpgrade1700000000005';

  async up(q: QueryRunner): Promise<void> {
    // 1. venue = the existing "restaurants" table
    await q.query(`ALTER TABLE "restaurants"
      ADD COLUMN "slug" varchar(80),
      ADD COLUMN "tenantType" varchar(20) NOT NULL DEFAULT 'RESTAURANT'
        CHECK ("tenantType" IN ('RESTAURANT','MALL_FOOD_COURT')),
      ADD COLUMN "planTier" varchar(20) NOT NULL DEFAULT 'STANDARD_3K'
        CHECK ("planTier" IN ('STANDARD_3K','PRO_5K','MALL_15K')),
      ADD COLUMN "paymentStatus" varchar(10) NOT NULL DEFAULT 'due'
        CHECK ("paymentStatus" IN ('due','paid','overdue')),
      ADD COLUMN "paidUntil" date`);
    await q.query(`UPDATE "restaurants" r SET "slug" = x.slug FROM (
        SELECT n."id", CASE WHEN n.rn = 1 THEN n.base ELSE n.base || '-' || substr(n."id"::text, 1, 6) END AS slug
        FROM (
          SELECT b."id", b.base, row_number() OVER (PARTITION BY b.base ORDER BY b."createdAt", b."id") AS rn
          FROM (
            SELECT "id", "createdAt",
              COALESCE(NULLIF(trim(both '-' from lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'))), ''), 'venue') AS base
            FROM "restaurants"
          ) b
        ) n
      ) x WHERE r."id" = x."id"`);
    await q.query(`CREATE UNIQUE INDEX "uq_restaurants_slug" ON "restaurants" ("slug") WHERE "slug" IS NOT NULL`);

    // 2. branch slugs (unique inside one venue)
    await q.query(`ALTER TABLE "branches" ADD COLUMN "slug" varchar(80)`);
    await q.query(`UPDATE "branches" br SET "slug" = x.slug FROM (
        SELECT n."id", CASE WHEN n.rn = 1 THEN n.base ELSE n.base || '-' || substr(n."id"::text, 1, 6) END AS slug
        FROM (
          SELECT b."id", b.base, row_number() OVER (PARTITION BY b."restaurantId", b.base ORDER BY b."createdAt", b."id") AS rn
          FROM (
            SELECT "id", "restaurantId", "createdAt",
              COALESCE(NULLIF(trim(both '-' from lower(regexp_replace("branchName", '[^a-zA-Z0-9]+', '-', 'g'))), ''), 'branch') AS base
            FROM "branches"
          ) b
        ) n
      ) x WHERE br."id" = x."id"`);
    await q.query(`CREATE UNIQUE INDEX "uq_branches_slug" ON "branches" ("restaurantId", "slug") WHERE "slug" IS NOT NULL`);

    // 3. food court stalls
    await q.query(`CREATE TABLE "vendors" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "restaurantId" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
      "name" varchar(120) NOT NULL,
      "logoUrl" varchar(500),
      "category" varchar(80),
      "isOpen" boolean NOT NULL DEFAULT true,
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE UNIQUE INDEX "uq_vendors_name" ON "vendors" ("restaurantId", lower("name"))`);

    // 4. a stall login is a user with role 'vendor' tied to one vendor
    await q.query(`ALTER TABLE "users" ADD COLUMN "vendorId" uuid REFERENCES "vendors"("id") ON DELETE SET NULL`);
    await q.query(`ALTER TABLE "users" DROP CONSTRAINT "users_role_check"`);
    await q.query(`ALTER TABLE "users" ADD CONSTRAINT "users_role_check"
      CHECK ("role" IN ('owner','manager','staff','vendor'))`);

    // 5. requests: who they are for, bell counter, one open request PER TARGET
    await q.query(`ALTER TABLE "assist_requests"
      ADD COLUMN "vendorId" uuid REFERENCES "vendors"("id") ON DELETE SET NULL,
      ADD COLUMN "targetType" varchar(20) NOT NULL DEFAULT 'STAFF'
        CHECK ("targetType" IN ('STAFF','HOUSEKEEPING','VENDOR')),
      ADD COLUMN "bellCount" smallint NOT NULL DEFAULT 0 CHECK ("bellCount" BETWEEN 0 AND 2),
      ADD COLUMN "lastBellAt" timestamptz,
      ADD CONSTRAINT "chk_vendor_target" CHECK (("targetType" = 'VENDOR') = ("vendorId" IS NOT NULL))`);
    // computed by the database, so it can never disagree with targetType and vendorId
    await q.query(`ALTER TABLE "assist_requests" ADD COLUMN "targetKey" varchar(60) GENERATED ALWAYS AS (
      CASE WHEN "targetType" = 'VENDOR' THEN 'vendor:' || "vendorId"::text
           WHEN "targetType" = 'HOUSEKEEPING' THEN 'housekeeping'
           ELSE 'staff' END) STORED`);
    // if the earlier single-bell column exists, carry it over
    await q.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'assist_requests' AND column_name = 'bellAt') THEN
        UPDATE "assist_requests" SET "bellCount" = 1, "lastBellAt" = "bellAt" WHERE "bellAt" IS NOT NULL;
      END IF;
    END $$`);
    await q.query(`ALTER TABLE "assist_requests" DROP CONSTRAINT "assist_requests_type_check"`);
    await q.query(`ALTER TABLE "assist_requests" ADD CONSTRAINT "assist_requests_type_check" CHECK ("type" IN
      ('staff','supplies','bill','other','call_waiter','water','menu','cleaning','assistance',
       'clean_table','spill','baby_chair','extra_dip','order_status'))`);
    await q.query(`DROP INDEX "uq_one_open_request_per_table"`);
    await q.query(`CREATE UNIQUE INDEX "uq_one_open_request_per_target" ON "assist_requests" ("tableId", "targetKey")
      WHERE "status" IN ('pending','approved','accepted','in_progress')`);
    await q.query(`CREATE INDEX "idx_requests_vendor" ON "assist_requests" ("vendorId", "status") WHERE "vendorId" IS NOT NULL`);

    // 6. a venue asks you for a change (new table, replace a QR, close a table)
    await q.query(`CREATE TABLE "change_requests" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "restaurantId" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
      "kind" varchar(20) NOT NULL CHECK ("kind" IN ('new_table','replace_qr','disable_table','other')),
      "message" varchar(500) NOT NULL,
      "status" varchar(10) NOT NULL DEFAULT 'open' CHECK ("status" IN ('open','done')),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "resolvedAt" timestamptz
    )`);
    await q.query(`CREATE INDEX "idx_change_requests_open" ON "change_requests" ("status", "createdAt")`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "change_requests"`);
    await q.query(`DROP INDEX "idx_requests_vendor"`);
    await q.query(`DROP INDEX "uq_one_open_request_per_target"`);
    await q.query(`CREATE UNIQUE INDEX "uq_one_open_request_per_table" ON "assist_requests" ("tableId")
      WHERE "status" IN ('pending','approved','accepted','in_progress')`);
    await q.query(`ALTER TABLE "assist_requests" DROP CONSTRAINT "assist_requests_type_check"`);
    await q.query(`ALTER TABLE "assist_requests" ADD CONSTRAINT "assist_requests_type_check" CHECK ("type" IN
      ('staff','supplies','bill','other','call_waiter','water','menu','cleaning','assistance'))`);
    await q.query(`ALTER TABLE "assist_requests" DROP COLUMN "targetKey"`);
    await q.query(`ALTER TABLE "assist_requests" DROP CONSTRAINT "chk_vendor_target"`);
    await q.query(`ALTER TABLE "assist_requests"
      DROP COLUMN "lastBellAt", DROP COLUMN "bellCount", DROP COLUMN "targetType", DROP COLUMN "vendorId"`);
    await q.query(`ALTER TABLE "users" DROP CONSTRAINT "users_role_check"`);
    await q.query(`ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("role" IN ('owner','manager','staff'))`);
    await q.query(`ALTER TABLE "users" DROP COLUMN "vendorId"`);
    await q.query(`DROP TABLE "vendors"`);
    await q.query(`DROP INDEX "uq_branches_slug"`);
    await q.query(`ALTER TABLE "branches" DROP COLUMN "slug"`);
    await q.query(`DROP INDEX "uq_restaurants_slug"`);
    await q.query(`ALTER TABLE "restaurants" DROP COLUMN "paidUntil", DROP COLUMN "paymentStatus", DROP COLUMN "planTier", DROP COLUMN "tenantType", DROP COLUMN "slug"`);
  }
}