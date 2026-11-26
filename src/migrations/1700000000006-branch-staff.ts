import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One shared staff login per branch: staff sign in with a username (not an email),
 * and a branch can have at most one staff account.
 * down() only works while no branch staff account exists (they have no email).
 */
export class BranchStaff1700000000006 implements MigrationInterface {
  name = 'BranchStaff1700000000006';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL`);
    await q.query(`ALTER TABLE "users" ADD COLUMN "username" varchar(80)`);
    await q.query(`CREATE UNIQUE INDEX "uq_users_username" ON "users" (lower("username")) WHERE "username" IS NOT NULL`);
    await q.query(`ALTER TABLE "users" ADD CONSTRAINT "chk_user_login" CHECK ("email" IS NOT NULL OR "username" IS NOT NULL)`);
    await q.query(`CREATE UNIQUE INDEX "uq_one_staff_per_branch" ON "users" ("branchId") WHERE "role" = 'staff'`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX "uq_one_staff_per_branch"`);
    await q.query(`ALTER TABLE "users" DROP CONSTRAINT "chk_user_login"`);
    await q.query(`DROP INDEX "uq_users_username"`);
    await q.query(`ALTER TABLE "users" DROP COLUMN "username"`);
    await q.query(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`);
  }
}