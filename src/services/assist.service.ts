import {
  ConflictException, HttpException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AssistRequest, RequestStatus, RequestType } from '../entities/assist-request.entity';
import { isUniqueViolation } from '../common/crypto';
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
  private get cooldownMs() { return this.num('REMIND_COOLDOWN_SECONDS', 120) * 1000; }

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
    const last = (r.remindedAt ?? r.createdAt).getTime();
    return {
      id: r.id, type: r.type, details: r.details, status: r.status, reminders: r.reminders,
      rejectReason: r.rejectReason, createdAt: iso(r.createdAt), approvedAt: iso(r.approvedAt), closedAt: iso(r.closedAt),
      remindAvailableAt: r.status === 'pending' ? new Date(last + this.cooldownMs).toISOString() : null,
    };
  }
  private staffView(r: AssistRequest) {
    return {
      id: r.id,
      branch: { id: r.branchId, name: r.branch?.branchName },
      table: { id: r.tableId, number: r.table?.tableNumber },
      type: r.type, details: r.details, status: r.status, reminders: r.reminders,
      remindedAt: iso(r.remindedAt), createdAt: iso(r.createdAt), approvedAt: iso(r.approvedAt),
      closedAt: iso(r.closedAt), closedBy: r.closedBy, rejectReason: r.rejectReason,
    };
  }

  // ---- customer side (identified only by the QR token) ----
  private async openForTable(tableId: string) {
    return this.repo.findOne({ where: { tableId, status: In(OPEN) } });
  }

  async create(token: string, dto: { type: string; details?: string }) {
    const info = await this.tables.resolveToken(token);
    const existing = await this.openForTable(info.table.id);
    if (existing) return { existing: true, request: this.customerView(existing) };
    try {
      const saved = await this.repo.save(this.repo.create({
        restaurantId: info.restaurant.id, branchId: info.branch.id, tableId: info.table.id,
        type: dto.type as RequestType, details: dto.details?.trim() || null, status: 'pending',
      }));
      return { existing: false, request: this.customerView(saved) };
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

  async remind(token: string, id: string) {
    const r = await this.ownedByToken(token, id);
    if (r.status !== 'pending') throw new ConflictException(`Request is already ${r.status}`);
    const wait = (r.remindedAt ?? r.createdAt).getTime() + this.cooldownMs - Date.now();
    if (wait > 0) {
      throw new HttpException({ statusCode: 429, message: 'Please wait before reminding again', retryAfterSeconds: Math.ceil(wait / 1000) }, 429);
    }
    r.reminders += 1;
    r.remindedAt = new Date();
    return { request: this.customerView(await this.repo.save(r)) };
  }

  /** Only the customer completes, and only after staff approved. */
  async complete(token: string, id: string) {
    const r = await this.ownedByToken(token, id);
    const res = await this.repo.update({ id, status: 'approved' }, { status: 'completed', closedBy: 'customer', closedAt: new Date() });
    if (!res.affected) {
      throw new ConflictException(r.status === 'pending' ? 'Staff have not approved this request yet' : `Request is already ${r.status}`);
    }
    return { request: this.customerView(await this.repo.findOneOrFail({ where: { id } })) };
  }

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
    return { serverTime: new Date().toISOString(), needsAction: needsAction.map((r) => this.staffView(r)), inProgress: inProgress.map((r) => this.staffView(r)) };
  }

  async history(restaurantId: string, branchId?: string) {
    const rows = await this.repo.find({
      where: { restaurantId, status: In(CLOSED), ...(branchId ? { branchId } : {}) },
      relations: { table: true, branch: true }, order: { closedAt: 'DESC' }, take: 50,
    });
    return rows.map((r) => this.staffView(r));
  }

  private async transition(restaurantId: string, id: string, from: RequestStatus, patch: Record<string, unknown>) {
    const res = await this.repo.update({ id, restaurantId, status: from }, patch as any);
    if (!res.affected) {
      const cur = await this.repo.findOne({ where: { id, restaurantId } });
      if (!cur) throw new NotFoundException('Request not found');
      throw new ConflictException(`Request is already ${cur.status}`);
    }
    return this.staffView(await this.repo.findOneOrFail({ where: { id }, relations: { table: true, branch: true } }));
  }

  approve(restaurantId: string, id: string) {
    return this.transition(restaurantId, id, 'pending', { status: 'approved', approvedAt: new Date() });
  }
  reject(restaurantId: string, id: string, reason?: string) {
    return this.transition(restaurantId, id, 'pending', { status: 'rejected', rejectReason: reason?.trim() || null, closedBy: 'staff', closedAt: new Date() });
  }
  /** Staff force-close an approved request the customer never confirmed. */
  close(restaurantId: string, id: string) {
    return this.transition(restaurantId, id, 'approved', { status: 'completed', closedBy: 'staff', closedAt: new Date() });
  }
}
