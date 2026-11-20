import { MigrationInterface, QueryRunner } from 'typeorm';

export class MenuSchema1700000000001 implements MigrationInterface {
  name = 'MenuSchema1700000000001';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "menu_categories" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "restaurantId" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
      "name" varchar NOT NULL,
      "sortOrder" int NOT NULL DEFAULT 0,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "idx_menu_categories_restaurant" ON "menu_categories" ("restaurantId")`);
    await q.query(`CREATE TABLE "menu_items" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "categoryId" uuid NOT NULL REFERENCES "menu_categories"("id") ON DELETE CASCADE,
      "restaurantId" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
      "name" varchar NOT NULL,
      "description" text,
      "pricePaise" int NOT NULL CHECK ("pricePaise" >= 0),
      "isAvailable" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "idx_menu_items_restaurant" ON "menu_items" ("restaurantId")`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "menu_items"`);
    await q.query(`DROP TABLE "menu_categories"`);
  }
}
