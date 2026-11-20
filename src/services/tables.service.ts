import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { RestaurantTable } from '../entities/restaurant-table.entity';
import { QrCode } from '../entities/qr-code.entity';
import { isUniqueViolation, randomToken, sha256 } from '../common/crypto';
import { BranchesService } from './branches.service';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(RestaurantTable) private tables: Repository<RestaurantTable>,
    @InjectRepository(QrCode) private qrs: Repository<QrCode>,
    private ds: DataSource,
    private cfg: ConfigService,
    private branches: BranchesService,
  ) {}

  private get baseUrl() {
    return (this.cfg.get<string>('PUBLIC_BASE_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
  }

  /** Revokes any active QR for the table and issues a fresh one. */
  private async issueQr(m: EntityManager, tableId: string) {
    await m.update(QrCode, { tableId, active: true }, { active: false, revokedAt: new Date() });
    const token = randomToken();
    await m.save(QrCode, m.create(QrCode, { tableId, tokenHash: sha256(token), active: true }));
    return `${this.baseUrl}/t/${token}`;
  }

  private async qrPayload(url: string) {
    return { url, imageDataUrl: await QRCode.toDataURL(url, { width: 512, margin: 2 }) };
  }

  async createTable(restaurantId: string, branchId: string, tableNumber: string) {
    await this.branches.getOwned(restaurantId, branchId);
    try {
      const { table, url } = await this.ds.transaction(async (m) => {
        const table = await m.save(RestaurantTable, m.create(RestaurantTable, { branchId, tableNumber: tableNumber.trim() }));
        const url = await this.issueQr(m, table.id);
        return { table, url };
      });
      return { id: table.id, branchId, tableNumber: table.tableNumber, qr: await this.qrPayload(url) };
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Table number already exists in this branch');
      throw e;
    }
  }

  async listTables(restaurantId: string, branchId: string) {
    await this.branches.getOwned(restaurantId, branchId);
    return this.tables.find({ where: { branchId }, order: { tableNumber: 'ASC' } });
  }

  private async getOwnedTable(restaurantId: string, tableId: string) {
    const t = await this.tables.findOne({ where: { id: tableId }, relations: { branch: true } });
    if (!t || t.branch.restaurantId !== restaurantId) throw new NotFoundException('Table not found');
    return t;
  }

  async regenerateQr(restaurantId: string, tableId: string) {
    const t = await this.getOwnedTable(restaurantId, tableId);
    const url = await this.ds.transaction((m) => this.issueQr(m, t.id));
    return { table: t, url };
  }

  png(url: string) {
    return QRCode.toBuffer(url, { width: 1024, margin: 2 });
  }

  async regenerateJson(restaurantId: string, tableId: string) {
    const { table, url } = await this.regenerateQr(restaurantId, tableId);
    return { tableId: table.id, tableNumber: table.tableNumber, qr: await this.qrPayload(url) };
  }

  /** Public scan: token -> restaurant/branch/table. */
  async resolveToken(token: string) {
    const qr = await this.qrs.findOne({
      where: { tokenHash: sha256(token), active: true },
      relations: { table: { branch: { restaurant: true } } },
    });
    if (!qr || qr.table.branch.restaurant.status !== 'approved') throw new NotFoundException('Invalid or expired QR');
    const { table } = qr;
    return {
      restaurant: { id: table.branch.restaurant.id, name: table.branch.restaurant.name },
      branch: { id: table.branch.id, name: table.branch.branchName, address: table.branch.address },
      table: { id: table.id, number: table.tableNumber },
    };
  }
}
