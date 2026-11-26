import {
  ConflictException, HttpException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AssistRequest, RequestStatus, RequestType } from '../entities/assist-request.entity';
import { isUniqueViolation, randomToken, sha256 } from '../common/crypto';
import { TablesService } from './tables.service';

const OPEN: RequestStatus[] = ['pending', 'approved', 'accepted', 'in_progress'];
const CLOSED: RequestStatus[] = ['completed', 'rejected', 'expired'];
const iso = (d: Date | null) => (d ? d.toISOString() : null);

@Injectable()
export class AssistService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(AssistRequest) private repo: Repository<AssistRequest>,
    private tables: TablesService,
    private cfg: ConfigService,
  ) {}

  private num(key: string, fallback: number) {
    const n = Number(this.cfg.get(key));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }
  // after staff accepted, how long the customer waits before "Raise again" (default 5 minutes)
  private get cooldownMs() { return this.num('REMIND_COOLDOWN_SECONDS', 300) * 1000; }
  // after this long without an answer, staff see the request as OVERDUE (default 5 minutes)
  private get overdueSeconds() { return this.num('REQUEST_OVERDUE_SECONDS', 300); }

  // ---- auto-close sweep: nothing stays open forever ----
  onModuleInit() {
    this.timer = setInterval(() => this.sweep().catch((e) => console.error('sweep failed', e)), 60_000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async sweep() {
    await this.repo.query(
      `UPDATE "assist_requests" SET "status"='completed', "closedBy"='timeout', "closedAt"=now()
       WHERE "status"='approved' AND "approvedAt" < now() - ($1 * interval '1 minute')`,
      [this.num('REQUEST_AUTO_CLOSE_MINUTES', 30)],
    );
    await this.repo.query(
      `UPDATE "assist_requests" SET "status"='expired', "closedBy"='timeout', "closedAt"=now()
       WHERE "status"='pending' AND "createdAt" < now() - ($1 * interval '1 minute')`,
      [this.num('REQUEST_PENDING_EXPIRE_MINUTES', 120)],
    );
  }

  // ---- views ----
  private customerView(r: AssistRequest) {
    return {
      id: r.id, type: r.type, details: r.details, status: r.status, reminders: r.reminders,
      rejectReason: r.rejectReason, bellAt: iso(r.bellAt), createdAt: iso(r.createdAt),
      approvedAt: iso(r.approvedAt), closedAt: iso(r.closedAt),
      // "Raise again" opens this long after staff accepted and nobody came
      remindAvailableAt: r.status === 'approved' && r.approvedAt ? new Date(r.approvedAt.getTime() + this.cooldownMs).toISOString() : null,
    };
  }
  private staffView(r: AssistRequest) {
    return {
      id: r.id,
      branch: { id: r.branchId, name: r.branch?.branchName },
      table: { id: r.tableId, number: r.table?.tableNumber },
      type: r.type, details: r.details, status: r.status, reminders: r.reminders,
      remindedAt: iso(r.remindedAt), bellAt: iso(r.bellAt), createdAt: iso(r.createdAt),
      overdue: r.status === 'pending' && Date.now() - r.createdAt.getTime() > this.overdueSeconds * 1000,
      approvedAt: iso(r.approvedAt), closedAt: iso(r.closedAt), closedBy: r.closedBy, rejectReason: r.rejectReason,
      // the branch login is shared, so we show the branch account, never a person
      acceptedBy: r.acceptedBy ? `${r.branch?.branchName ?? 'Branch'} Staff` : null,
    };
  }

  // ---- customer side (identified only by the QR token) ----
  private async openForTable(tableId: string) {
    return this.repo.findOne({ where: { tableId, status: In(OPEN) } });
  }

  /** Creates the request. The secret tracking token is returned ONCE, only its hash is stored. */
  async create(token: string, dto: { type: string; details?: string }) {
    const info = await this.tables.resolveToken(token);
    const existing = await this.openForTable(info.table.id);
    if (existing) return { existing: true, request: this.customerView(existing) };
    const trackingToken = randomToken();
    try {
      const saved = await this.repo.save(this.repo.create({
        restaurantId: info.restaurant.id, branchId: info.branch.id, tableId: info.table.id,
        type: dto.type as RequestType, details: dto.details?.trim() || null, status: 'pending',
        trackingHash: sha256(trackingToken),
      }));
      return { existing: false, request: this.customerView(saved), trackingToken };
    } catch (e) {
      if (isUniqueViolation(e)) { // two scans at the same moment
        const again = await this.openForTable(info.table.id);
        if (again) return { existing: true, request: this.customerView(again) };
      }
      throw e;
    }
  }

  /** Open request, or one closed in the last 10 minutes (so the customer still sees the result). */
  async current(token: string) {
    const info = await this.tables.resolveToken(token);
    const r = await this.repo.findOne({ where: { tableId: info.table.id }, order: { createdAt: 'DESC' } });
    const fresh = r && (OPEN.includes(r.status) || (r.closedAt && Date.now() - r.closedAt.getTime() < 10 * 60_000));
    return { serverTime: new Date().toISOString(), request: fresh ? this.customerView(r) : null };
  }

  private async ownedByToken(token: string, id: string) {
    const info = await this.tables.resolveToken(token);
    const r = await this.repo.findOne({ where: { id, tableId: info.table.id } });
    if (!r) throw new NotFoundException('Request not found');
    return r;
  }

  /**
   * "Raise again": only after staff accepted and nobody came, and only after the wait time.
   * The request goes back to the top of the staff queue as re-raised.
   */
  private async raise(r: AssistRequest) {
    if (r.status === 'pending') throw new ConflictException('Your request is still waiting. Staff can already see it.');
    if (r.status !== 'approved') throw new ConflictException(`Request is already ${r.status}`);
    const wait = r.approvedAt!.getTime() + this.cooldownMs - Date.now();
    if (wait > 0) {
      throw new HttpException({ statusCode: 429, message: 'Please wait a little before raising it again', retryAfterSeconds: Math.ceil(wait / 1000) }, 429);
    }
    const res = await this.repo.update({ id: r.id, status: 'approved' }, {
      status: 'pending', approvedAt: null, acceptedBy: null, bellAt: null, remindedAt: new Date(), reminders: () => '"reminders" + 1',
    });
    if (!res.affected) throw new ConflictException('This request just changed. Please check again.');
    return { request: this.customerView(await this.repo.findOneOrFail({ where: { id: r.id } })) };
  }

  /** Only the customer completes, and only after staff accepted. */
  private async finish(r: AssistRequest) {
    const res = await this.repo.update({ id: r.id, status: 'approved' }, { status: 'completed', closedBy: 'customer', closedAt: new Date() });
    if (!res.affected) {
      throw new ConflictException(r.status === 'pending' ? 'Staff have not accepted this request yet' : `Request is already ${r.status}`);
    }
    return { request: this.customerView(await this.repo.findOneOrFail({ where: { id: r.id } })) };
  }

  async remind(token: string, id: string) { return this.raise(await this.ownedByToken(token, id)); }
  async complete(token: string, id: string) { return this.finish(await this.ownedByToken(token, id)); }

  // ---- customer tracking link (no QR, no login) ----
  private async byTracking(token: string) {
    const r = await this.repo.findOne({
      where: { trackingHash: sha256(token) },
      relations: { table: true, branch: { restaurant: true } },
    });
    if (!r || r.branch.restaurant.status !== 'approved') throw new NotFoundException('This tracking link is not valid');
    return r;
  }

  async track(token: string) {
    const r = await this.byTracking(token);
    return {
      serverTime: new Date().toISOString(),
      venue: r.branch.restaurant.name,
      branch: { name: r.branch.branchName, address: r.branch.address },
      table: { number: r.table.tableNumber },
      request: this.customerView(r),
    };
  }
  async trackRaise(token: string) { return this.raise(await this.byTracking(token)); }
  async trackComplete(token: string) { return this.finish(await this.byTracking(token)); }

  // ---- staff side ----
  async queue(restaurantId: string, branchId?: string) {
    const rows = await this.repo.find({
      where: { restaurantId, status: In(OPEN), ...(branchId ? { branchId } : {}) },
      relations: { table: true, branch: true },
    });
    const needsAction = rows.filter((r) => r.status === 'pending').sort((a, b) =>
      (Number(!!b.remindedAt) - Number(!!a.remindedAt)) ||
      (a.remindedAt && b.remindedAt ? b.remindedAt.getTime() - a.remindedAt.getTime() : a.createdAt.getTime() - b.createdAt.getTime()));
    const inProgress = rows.filter((r) => r.status === 'approved').sort((a, b) => a.approvedAt!.getTime() - b.approvedAt!.getTime());
    return {
      serverTime: new Date().toISOString(), overdueAfterSeconds: this.overdueSeconds,
      needsAction: needsAction.map((r) => this.staffView(r)), inProgress: inProgress.map((r) => this.staffView(r)),
    };
  }

  async history(restaurantId: string, branchId?: string) {
    const rows = await this.repo.find({
      where: { restaurantId, status: In(CLOSED), ...(branchId ? { branchId } : {}) },
      relations: { table: true, branch: true }, order: { closedAt: 'DESC' }, take: 50,
    });
    return rows.map((r) => this.staffView(r));
  }

  /**
   * One atomic update: it only succeeds if the request is still in the expected state AND belongs to this
   * venue (and branch, for a branch login). A request of another branch looks exactly like "not found".
   */
  private async transition(restaurantId: string, id: string, from: RequestStatus, patch: Record<string, unknown>, branchId?: string) {
    const scope = { id, restaurantId, ...(branchId ? { branchId } : {}) };
    const res = await this.repo.update({ ...scope, status: from }, patch as any);
    if (!res.affected) {
      const cur = await this.repo.findOne({ where: scope });
      if (!cur) throw new NotFoundException('Request not found');
      throw new ConflictException(`Request is already ${cur.status}`);
    }
    return this.staffView(await this.repo.findOneOrFail({ where: { id }, relations: { table: true, branch: true } }));
  }

  bell(restaurantId: string, id: string, branchId?: string) {
    return this.transition(restaurantId, id, 'pending', { bellAt: new Date() }, branchId);
  }
  approve(restaurantId: string, id: string, branchId?: string, userId?: string) {
    return this.transition(restaurantId, id, 'pending', { status: 'approved', approvedAt: new Date(), acceptedBy: userId ?? null }, branchId);
  }
  reject(restaurantId: string, id: string, reason?: string, branchId?: string) {
    return this.transition(restaurantId, id, 'pending', { status: 'rejected', rejectReason: reason?.trim() || null, closedBy: 'staff', closedAt: new Date() }, branchId);
  }
  /** Staff force-close an accepted request the customer never confirmed. */
  close(restaurantId: string, id: string, branchId?: string) {
    return this.transition(restaurantId, id, 'approved', { status: 'completed', closedBy: 'staff', closedAt: new Date() }, branchId);
  }
}