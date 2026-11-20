import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2: move the database to the Phase 1 design WITHOUT breaking the running app.
 * Everything here is additive (new tables, new columns, wider allowed values).
 * Old request types/statuses keep working until Phase 5 converts them.
 */
export class Phase2Design1700000000003 implements MigrationInterface {
  name = 'Phase2Design1700000000003';

  async up(q: QueryRunner): Promise<void> {
    // 1. extra columns on existing tables
    await q.query(`ALTER TABLE "restaurants"
      ADD COLUMN "phone" varchar(30),
      ADD COLUMN "address" varchar(300),
      ADD COLUMN "timezone" varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
      ADD COLUMN "updatedAt" timestamptz NOT NULL DEFAULT now()`);
    await q.query(`ALTER TABLE "restaurant_tables" ADD COLUMN "isActive" boolean NOT NULL DEFAULT true`);

    // 2. notification timings, one row per restaurant (existing restaurants get the defaults)
    await q.query(`CREATE TABLE "restaurant_settings" (
      "restaurantId" uuid PRIMARY KEY REFERENCES "restaurants"("id") ON DELETE CASCADE,
      "reminderAfterSeconds" int NOT NULL DEFAULT 120 CHECK ("reminderAfterSeconds" > 0),
      "escalateAfterSeconds" int NOT NULL DEFAULT 300,
      "overdueAfterSeconds" int NOT NULL DEFAULT 600,
      "repeatEverySeconds" int NOT NULL DEFAULT 300 CHECK ("repeatEverySeconds" >= 30),
      "maxNotifications" int NOT NULL DEFAULT 10 CHECK ("maxNotifications" BETWEEN 1 AND 50),
      "customerRemindCooldownSeconds" int NOT NULL DEFAULT 120 CHECK ("customerRemindCooldownSeconds" >= 0),
      "autoCloseMinutes" int NOT NULL DEFAULT 30 CHECK ("autoCloseMinutes" > 0),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CHECK ("reminderAfterSeconds" < "escalateAfterSeconds" AND "escalateAfterSeconds" < "overdueAfterSeconds")
    )`);
    await q.query(`INSERT INTO "restaurant_settings" ("restaurantId") SELECT "id" FROM "restaurants"`);

    // 3. staff and admin logins
    await q.query(`CREATE TABLE "users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "restaurantId" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
      "branchId" uuid REFERENCES "branches"("id") ON DELETE SET NULL,
      "name" varchar(120) NOT NULL,
      "email" varchar(254) NOT NULL,
      "passwordHash" varchar NOT NULL,
      "role" varchar(20) NOT NULL CHECK ("role" IN ('owner','manager','staff')),
      "isActive" boolean NOT NULL DEFAULT true,
      "lastLoginAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE UNIQUE INDEX "uq_users_email" ON "users" (lower("email"))`);
    await q.query(`CREATE INDEX "idx_users_restaurant" ON "users" ("restaurantId")`);

    // 4. anonymous customer sessions
    await q.query(`CREATE TABLE "customer_sessions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "tableId" uuid NOT NULL REFERENCES "restaurant_tables"("id") ON DELETE CASCADE,
      "qrCodeId" uuid REFERENCES "qr_codes"("id") ON DELETE SET NULL,
      "sessionHash" varchar NOT NULL UNIQUE,
      "userAgent" varchar(300),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "lastSeenAt" timestamptz NOT NULL DEFAULT now(),
      "expiresAt" timestamptz NOT NULL
    )`);
    await q.query(`CREATE INDEX "idx_sessions_table" ON "customer_sessions" ("tableId", "expiresAt")`);

    // 5. new columns on requests, and wider allowed values (old AND new)
    await q.query(`ALTER TABLE "assist_requests"
      ADD COLUMN "sessionId" uuid REFERENCES "customer_sessions"("id") ON DELETE SET NULL,
      ADD COLUMN "acceptedBy" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      ADD COLUMN "escalationLevel" smallint NOT NULL DEFAULT 0 CHECK ("escalationLevel" BETWEEN 0 AND 3),
      ADD COLUMN "isOverdue" boolean NOT NULL DEFAULT false,
      ADD COLUMN "overdueAt" timestamptz,
      ADD COLUMN "updatedAt" timestamptz NOT NULL DEFAULT now()`);
    await q.query(`ALTER TABLE "assist_requests" DROP CONSTRAINT "assist_requests_type_check"`);
    await q.query(`ALTER TABLE "assist_requests" ADD CONSTRAINT "assist_requests_type_check" CHECK ("type" IN
      ('staff','supplies','bill','other','call_waiter','water','menu','cleaning','assistance'))`);
    await q.query(`ALTER TABLE "assist_requests" DROP CONSTRAINT "assist_requests_status_check"`);
    await q.query(`ALTER TABLE "assist_requests" ADD CONSTRAINT "assist_requests_status_check" CHECK ("status" IN
      ('pending','approved','rejected','completed','expired','accepted','in_progress','cancelled'))`);
    await q.query(`DROP INDEX "uq_one_open_request_per_table"`);
    await q.query(`CREATE UNIQUE INDEX "uq_one_open_request_per_table" ON "assist_requests" ("tableId")
      WHERE "status" IN ('pending','approved','accepted','in_progress')`);

    // 6. notification history and status history
    await q.query(`CREATE TABLE "request_notifications" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "requestId" uuid NOT NULL REFERENCES "assist_requests"("id") ON DELETE CASCADE,
      "restaurantId" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
      "kind" varchar(20) NOT NULL CHECK ("kind" IN ('new','reminder','escalation','overdue','customer_reminder')),
      "channel" varchar(20) NOT NULL DEFAULT 'socket' CHECK ("channel" IN ('socket','push','email')),
      "recipientUserId" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "status" varchar(20) NOT NULL DEFAULT 'queued'
        CHECK ("status" IN ('queued','sent','delivered','failed','cancelled')),
      "scheduledFor" timestamptz NOT NULL DEFAULT now(),
      "sentAt" timestamptz,
      "readAt" timestamptz,
      "error" text,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "idx_notifications_due" ON "request_notifications" ("scheduledFor") WHERE "status" = 'queued'`);
    await q.query(`CREATE INDEX "idx_notifications_request" ON "request_notifications" ("requestId", "createdAt")`);
    await q.query(`CREATE TABLE "request_status_history" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "requestId" uuid NOT NULL REFERENCES "assist_requests"("id") ON DELETE CASCADE,
      "fromStatus" varchar(20),
      "toStatus" varchar(20) NOT NULL
        CHECK ("toStatus" IN ('pending','accepted','in_progress','completed','cancelled')),
      "changedByType" varchar(20) NOT NULL CHECK ("changedByType" IN ('customer','staff','system')),
      "changedByUserId" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "note" varchar(200),
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "idx_status_history_request" ON "request_status_history" ("requestId", "createdAt")`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "request_status_history"`);
    await q.query(`DROP TABLE "request_notifications"`);
    await q.query(`DROP INDEX "uq_one_open_request_per_table"`);
    await q.query(`CREATE UNIQUE INDEX "uq_one_open_request_per_table" ON "assist_requests" ("tableId") WHERE "status" IN ('pending','approved')`);
    await q.query(`ALTER TABLE "assist_requests" DROP CONSTRAINT "assist_requests_status_check"`);
    await q.query(`ALTER TABLE "assist_requests" ADD CONSTRAINT "assist_requests_status_check" CHECK ("status" IN ('pending','approved','rejected','completed','expired'))`);
    await q.query(`ALTER TABLE "assist_requests" DROP CONSTRAINT "assist_requests_type_check"`);
    await q.query(`ALTER TABLE "assist_requests" ADD CONSTRAINT "assist_requests_type_check" CHECK ("type" IN ('staff','supplies','bill','other'))`);
    await q.query(`ALTER TABLE "assist_requests" DROP COLUMN "sessionId", DROP COLUMN "acceptedBy", DROP COLUMN "escalationLevel", DROP COLUMN "isOverdue", DROP COLUMN "overdueAt", DROP COLUMN "updatedAt"`);
    await q.query(`DROP TABLE "customer_sessions"`);
    await q.query(`DROP TABLE "users"`);
    await q.query(`DROP TABLE "restaurant_settings"`);
    await q.query(`ALTER TABLE "restaurant_tables" DROP COLUMN "isActive"`);
    await q.query(`ALTER TABLE "restaurants" DROP COLUMN "phone", DROP COLUMN "address", DROP COLUMN "timezone", DROP COLUMN "updatedAt"`);
  }
}