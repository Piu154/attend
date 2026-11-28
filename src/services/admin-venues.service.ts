import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Restaurant, PlanTier, TenantType } from '../entities/restaurant.entity';
import { RestaurantSettings } from '../entities/restaurant-settings.entity';
import { Branch } from '../entities/branch.entity';
import { User } from '../entities/user.entity';
import { isUniqueViolation, randomToken, sha256 } from '../common/crypto';
import { hashPassword } from '../common/password';
import { PLANS, calcBill } from '../common/plans';
import { generatePassword, slugify } from '../common/venue-utils';
import { CreateBranchDto } from '../dto/dtos';
import { UpdateTableDto } from '../dto/manage.dto';
import { CreateVenueDto, PaymentDto, UpdateVenueDto } from '../dto/admin.dto';
import { TablesService } from './tables.service';

const natural = (a: { tableNumber: string }, b: { tableNumber: string }) =>
  a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true });

@Injectable()
export class AdminVenuesService {
  constructor(
    @InjectRepository(Restaurant) private repo: Repository<Restaurant>,
    @InjectRepository(Branch) private branches: Repository<Branch>,
    private ds: DataSource,
    private tables: TablesService,
  ) {}

  // ---------------------------------------------------------------- venues, usage and bills

  /** Every venue with its usage, limits and calculated monthly bill. */
  async rows(onlyId?: string) {
    const rows = await this.ds.query(
      `SELECT r."id", r."name", r."email", r."slug", r."tenantType", r."planTier", r."status", r."paymentStatus",
              to_char(r."paidUntil", 'YYYY-MM-DD') AS "paidUntil", r."createdAt",
              (SELECT count(*) FROM "branches" b WHERE b."restaurantId" = r."id")::int AS "branchCount",
              (SELECT count(*) FROM "restaurant_tables" t JOIN "branches" b ON b."id" = t."branchId"
                 WHERE b."restaurantId" = r."id" AND t."isActive")::int AS "activeTableCount",
              (SELECT count(*) FROM "vendors" v WHERE v."restaurantId" = r."id" AND v."isActive")::int AS "vendorCount",
              (SELECT count(*) FROM "assist_requests" a WHERE a."restaurantId" = r."id"
                 AND a."status" IN ('pending','approved'))::int AS "openRequests"
       FROM "restaurants" r ${onlyId ? 'WHERE r."id" = $1' : ''} ORDER BY r."createdAt" DESC`,
      onlyId ? [onlyId] : [],
    );
    const today = new Date().toISOString().slice(0, 10);
    return rows.map((r: any) => {
      const plan = PLANS[r.planTier as PlanTier];
      const bill = calcBill(r.planTier, r.branchCount, r.activeTableCount);
      // "paid" runs out on its date: after that the venue shows as overdue
      const payment = r.paymentStatus === 'paid' && r.paidUntil && r.paidUntil < today ? 'overdue' : r.paymentStatus;
      return {
        id: r.id, name: r.name, email: r.email, slug: r.slug, tenantType: r.tenantType, status: r.status,
        planTier: r.planTier, planLabel: plan.label, createdAt: r.createdAt,
        usage: {
          branches: r.branchCount, includedBranches: plan.includedBranches,
          activeTables: r.activeTableCount, includedTables: plan.includedTables,
          vendors: r.vendorCount, openRequests: r.openRequests,
        },
        bill, payment, paidUntil: r.paidUntil,
      };
    });
  }

  async list() {
    const venues = await this.rows();
    const live = venues.filter((v: any) => v.status === 'approved');
    const sum = (list: any[]) => list.reduce((s: number, v: any) => s + v.bill.total, 0);
    return {
      totals: {
        venues: venues.length,
        active: live.length,
        pending: venues.filter((v: any) => v.status === 'pending').length,
        monthlyRevenue: sum(live),                                      // what active venues owe per month
        collectedAmount: sum(live.filter((v: any) => v.payment === 'paid')),
        unpaidAmount: sum(live.filter((v: any) => v.payment !== 'paid')),
        openRequests: venues.reduce((s: number, v: any) => s + v.usage.openRequests, 0),
      },
      venues,
    };
  }

  private async one(id: string) {
    const [v] = await this.rows(id);
    if (!v) throw new NotFoundException('Venue not found');
    return v;
  }

  private assertPlan(tenantType: string, planTier: string) {
    if (PLANS[planTier as PlanTier].tenantType !== tenantType) {
      throw new BadRequestException(
        tenantType === 'MALL_FOOD_COURT' ? 'A mall food court must use the Mall plan' : 'A restaurant must use the Standard or Pro plan',
      );
    }
  }

  private async uniqueSlug(m: EntityManager, name: string) {
    const base = slugify(name);
    let candidate = base;
    for (let n = 2; await m.count(Restaurant, { where: { slug: candidate } }); n++) candidate = `${base}-${n}`;
    return candidate;
  }

  /** You onboard venues yourself. A venue has no login of its own: access is through its branch staff logins. */
  async create(dto: CreateVenueDto) {
    this.assertPlan(dto.tenantType, dto.planTier);
    try {
      const id = await this.ds.transaction(async (m) => {
        const r = await m.save(Restaurant, m.create(Restaurant, {
          name: dto.name.trim(), email: dto.email.toLowerCase().trim(), status: 'approved',
          tenantType: dto.tenantType as TenantType, planTier: dto.planTier as PlanTier,
          slug: await this.uniqueSlug(m, dto.name), ownerKeyHash: sha256(randomToken()), // the old key is never shown
        }));
        await m.insert(RestaurantSettings, { restaurantId: r.id });
        return r.id;
      });
      return { venue: await this.one(id) };
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('That email is already used by another venue');
      throw e;
    }
  }
  async update(id: string, dto: UpdateVenueDto) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Venue not found');
    if (dto.planTier !== undefined) {
      this.assertPlan(r.tenantType, dto.planTier);
      r.planTier = dto.planTier as PlanTier;
    }
    if (dto.name !== undefined) r.name = dto.name.trim();
    if (dto.phone !== undefined) r.phone = dto.phone.trim() || null;
    if (dto.address !== undefined) r.address = dto.address.trim() || null;
    await this.repo.save(r);
    return this.one(id);
  }

  /** Manual "Mark as Paid": paid until a date (default one month ahead), or back to due / overdue. */
  async payment(id: string, dto: PaymentDto) {
    if (dto.action === 'paid') {
      await this.ds.query(
        `UPDATE "restaurants" SET "paymentStatus" = 'paid',
           "paidUntil" = COALESCE($2::date, (CURRENT_DATE + interval '1 month')::date) WHERE "id" = $1`,
        [id, dto.paidUntil ?? null],
      );
    } else {
      await this.ds.query(`UPDATE "restaurants" SET "paymentStatus" = $2, "paidUntil" = NULL WHERE "id" = $1`, [id, dto.action]);
    }
    return this.one(id); // also answers "not found" for an unknown id
  }

  // ---------------------------------------------------------------- branches, tables and QR codes

  async branchesOf(venueId: string) {
    await this.one(venueId);
    const branches = await this.branches.find({ where: { restaurantId: venueId }, order: { createdAt: 'ASC' } });
    const tables = await this.ds.query(
      `SELECT t."id", t."branchId", t."tableNumber", t."isActive" FROM "restaurant_tables" t
         JOIN "branches" b ON b."id" = t."branchId" WHERE b."restaurantId" = $1`,
      [venueId],
    );
    return branches.map((b) => ({
      id: b.id, branchName: b.branchName, address: b.address, slug: b.slug,
      tables: tables.filter((t: any) => t.branchId === b.id).sort(natural),
    }));
  }

  async addBranch(venueId: string, dto: CreateBranchDto) {
    await this.one(venueId);
    const base = slugify(dto.branchName, 'branch');
    let slug = base;
    for (let n = 2; await this.branches.count({ where: { restaurantId: venueId, slug } }); n++) slug = `${base}-${n}`;
    const b = await this.branches.save(
      this.branches.create({ restaurantId: venueId, branchName: dto.branchName.trim(), address: dto.address.trim(), slug }),
    );
    return { id: b.id, branchName: b.branchName, address: b.address, slug: b.slug, tables: [] };
  }

  private async branchOrFail(branchId: string) {
    const b = await this.branches.findOne({ where: { id: branchId }, relations: { restaurant: true } });
    if (!b) throw new NotFoundException('Branch not found');
    return b;
  }

  private async venueOfTable(tableId: string): Promise<string> {
    const [row] = await this.ds.query(
      `SELECT b."restaurantId" AS id FROM "restaurant_tables" t JOIN "branches" b ON b."id" = t."branchId" WHERE t."id" = $1`,
      [tableId],
    );
    if (!row) throw new NotFoundException('Table not found');
    return row.id;
  }

  /** Creates the tables and a QR for each. Numbers that already exist are skipped, not an error. */
  async addTables(branchId: string, numbers: string[]) {
    const b = await this.branchOrFail(branchId);
    const unique = [...new Set(numbers.map((n) => n.trim()).filter(Boolean))];
    const created: any[] = [];
    const skipped: string[] = [];
    for (const number of unique) {
      try {
        const t = await this.tables.createTable(b.restaurantId, branchId, number);
        created.push({ id: t.id, tableNumber: t.tableNumber, qr: t.qr });
      } catch (e) {
        if (e instanceof ConflictException) skipped.push(number);
        else throw e;
      }
    }
    return { venue: b.restaurant.name, branch: b.branchName, created: created.sort(natural), skipped };
  }

  /** Disable / enable / rename a table. A disabled table's QR stops working and it leaves the bill. */
  async updateTable(tableId: string, dto: UpdateTableDto) {
    return this.tables.updateTable(await this.venueOfTable(tableId), tableId, dto);
  }

  /** New QR for one table. The old QR stops working immediately. */
  async newQr(tableId: string) {
    return this.tables.regenerateJson(await this.venueOfTable(tableId), tableId);
  }

  /** New QR for EVERY active table of a branch, ready to print. All older QR codes of those tables stop working. */
  async sheet(branchId: string) {
    const b = await this.branchOrFail(branchId);
    const tables = await this.ds.query(
      `SELECT "id", "tableNumber" FROM "restaurant_tables" WHERE "branchId" = $1 AND "isActive"`,
      [branchId],
    );
    const items: any[] = [];
    for (const t of tables.sort(natural)) {
      const r = await this.tables.regenerateJson(b.restaurantId, t.id);
      items.push({ id: t.id, tableNumber: r.tableNumber, qr: r.qr });
    }
    return { venue: b.restaurant.name, branch: b.branchName, items };
  }
}