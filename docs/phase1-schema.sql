-- ATTEND  Phase 1  target schema (PostgreSQL 16)
-- Column names are camelCase in quotes, same as the migrations already in your project.

CREATE TABLE restaurants (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"         varchar(120) NOT NULL,
  "email"        varchar(254) NOT NULL UNIQUE,
  "phone"        varchar(30),
  "address"      varchar(300),
  "timezone"     varchar(64)  NOT NULL DEFAULT 'Asia/Kolkata',
  "status"       varchar(20)  NOT NULL DEFAULT 'pending'
                 CHECK ("status" IN ('pending','approved','rejected','suspended')),
  "ownerKeyHash" varchar      NOT NULL,
  "createdAt"    timestamptz  NOT NULL DEFAULT now(),
  "updatedAt"    timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE restaurant_settings (
  "restaurantId"                  uuid PRIMARY KEY REFERENCES restaurants("id") ON DELETE CASCADE,
  "reminderAfterSeconds"          int NOT NULL DEFAULT 120 CHECK ("reminderAfterSeconds" > 0),
  "escalateAfterSeconds"          int NOT NULL DEFAULT 300,
  "overdueAfterSeconds"           int NOT NULL DEFAULT 600,
  "repeatEverySeconds"            int NOT NULL DEFAULT 300 CHECK ("repeatEverySeconds" >= 30),
  "maxNotifications"              int NOT NULL DEFAULT 10  CHECK ("maxNotifications" BETWEEN 1 AND 50),
  "customerRemindCooldownSeconds" int NOT NULL DEFAULT 120 CHECK ("customerRemindCooldownSeconds" >= 0),
  "autoCloseMinutes"              int NOT NULL DEFAULT 30  CHECK ("autoCloseMinutes" > 0),
  "updatedAt"                     timestamptz NOT NULL DEFAULT now(),
  CHECK ("reminderAfterSeconds" < "escalateAfterSeconds" AND "escalateAfterSeconds" < "overdueAfterSeconds")
);

CREATE TABLE branches (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "restaurantId" uuid NOT NULL REFERENCES restaurants("id") ON DELETE CASCADE,
  "branchName"   varchar(120) NOT NULL,
  "address"      varchar(300) NOT NULL,
  "createdAt"    timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX idx_branches_restaurant ON branches ("restaurantId");

CREATE TABLE restaurant_tables (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "branchId"    uuid NOT NULL REFERENCES branches("id") ON DELETE CASCADE,
  "tableNumber" varchar(20) NOT NULL,
  "isActive"    boolean     NOT NULL DEFAULT true,
  "createdAt"   timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("branchId", "tableNumber")
);

CREATE TABLE qr_codes (
  "id"        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tableId"   uuid NOT NULL REFERENCES restaurant_tables("id") ON DELETE CASCADE,
  "tokenHash" varchar NOT NULL UNIQUE,
  "active"    boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "revokedAt" timestamptz
);
CREATE UNIQUE INDEX uq_one_active_qr_per_table ON qr_codes ("tableId") WHERE "active" = true;

CREATE TABLE users (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "restaurantId" uuid NOT NULL REFERENCES restaurants("id") ON DELETE CASCADE,
  "branchId"     uuid REFERENCES branches("id") ON DELETE SET NULL,
  "name"         varchar(120) NOT NULL,
  "email"        varchar(254) NOT NULL,
  "passwordHash" varchar NOT NULL,
  "role"         varchar(20) NOT NULL CHECK ("role" IN ('owner','manager','staff')),
  "isActive"     boolean NOT NULL DEFAULT true,
  "lastLoginAt"  timestamptz,
  "createdAt"    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_users_email ON users (lower("email"));
CREATE INDEX idx_users_restaurant ON users ("restaurantId");

CREATE TABLE customer_sessions (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tableId"     uuid NOT NULL REFERENCES restaurant_tables("id") ON DELETE CASCADE,
  "qrCodeId"    uuid REFERENCES qr_codes("id") ON DELETE SET NULL,
  "sessionHash" varchar NOT NULL UNIQUE,
  "userAgent"   varchar(300),
  "createdAt"   timestamptz NOT NULL DEFAULT now(),
  "lastSeenAt"  timestamptz NOT NULL DEFAULT now(),
  "expiresAt"   timestamptz NOT NULL
);
CREATE INDEX idx_sessions_table ON customer_sessions ("tableId", "expiresAt");

CREATE TABLE assist_requests (
  "id"                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "restaurantId"           uuid NOT NULL REFERENCES restaurants("id") ON DELETE CASCADE,
  "branchId"               uuid NOT NULL REFERENCES branches("id") ON DELETE CASCADE,
  "tableId"                uuid NOT NULL REFERENCES restaurant_tables("id") ON DELETE CASCADE,
  "sessionId"              uuid REFERENCES customer_sessions("id") ON DELETE SET NULL,
  "type"                   varchar(20) NOT NULL
        CHECK ("type" IN ('call_waiter','water','menu','bill','cleaning','assistance')),
  "details"                text,
  "status"                 varchar(20) NOT NULL DEFAULT 'pending'
        CHECK ("status" IN ('pending','accepted','in_progress','completed','cancelled')),
  "acceptedBy"             uuid REFERENCES users("id") ON DELETE SET NULL,
  "acceptedAt"             timestamptz,
  "completedAt"            timestamptz,
  "cancelledAt"            timestamptz,
  "cancelReason"           varchar(120),
  "closedBy"               varchar(20) CHECK ("closedBy" IN ('customer','staff','system')),
  "customerReminders"      int NOT NULL DEFAULT 0,
  "lastCustomerReminderAt" timestamptz,
  "escalationLevel"        smallint NOT NULL DEFAULT 0 CHECK ("escalationLevel" BETWEEN 0 AND 3),
  "isOverdue"              boolean NOT NULL DEFAULT false,
  "overdueAt"              timestamptz,
  "createdAt"              timestamptz NOT NULL DEFAULT now(),
  "updatedAt"              timestamptz NOT NULL DEFAULT now()
);
-- one open request per table
CREATE UNIQUE INDEX uq_one_open_request_per_table ON assist_requests ("tableId")
  WHERE "status" IN ('pending','accepted','in_progress');
CREATE INDEX idx_requests_queue ON assist_requests ("restaurantId", "status", "createdAt");
CREATE INDEX idx_requests_history ON assist_requests ("restaurantId", "createdAt" DESC);

CREATE TABLE request_notifications (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "requestId"       uuid NOT NULL REFERENCES assist_requests("id") ON DELETE CASCADE,
  "restaurantId"    uuid NOT NULL REFERENCES restaurants("id") ON DELETE CASCADE,
  "kind"            varchar(20) NOT NULL
        CHECK ("kind" IN ('new','reminder','escalation','overdue','customer_reminder')),
  "channel"         varchar(20) NOT NULL DEFAULT 'socket' CHECK ("channel" IN ('socket','push','email')),
  "recipientUserId" uuid REFERENCES users("id") ON DELETE SET NULL,
  "status"          varchar(20) NOT NULL DEFAULT 'queued'
        CHECK ("status" IN ('queued','sent','delivered','failed','cancelled')),
  "scheduledFor"    timestamptz NOT NULL DEFAULT now(),
  "sentAt"          timestamptz,
  "readAt"          timestamptz,
  "error"           text,
  "createdAt"       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_due ON request_notifications ("scheduledFor") WHERE "status" = 'queued';
CREATE INDEX idx_notifications_request ON request_notifications ("requestId", "createdAt");

CREATE TABLE request_status_history (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "requestId"       uuid NOT NULL REFERENCES assist_requests("id") ON DELETE CASCADE,
  "fromStatus"      varchar(20),
  "toStatus"        varchar(20) NOT NULL
        CHECK ("toStatus" IN ('pending','accepted','in_progress','completed','cancelled')),
  "changedByType"   varchar(20) NOT NULL CHECK ("changedByType" IN ('customer','staff','system')),
  "changedByUserId" uuid REFERENCES users("id") ON DELETE SET NULL,
  "note"            varchar(200),
  "createdAt"       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_history_request ON request_status_history ("requestId", "createdAt");