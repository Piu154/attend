import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Branch } from '../entities/branch.entity';
import { User } from '../entities/user.entity';
import { isUniqueViolation } from '../common/crypto';
import { hashPassword } from '../common/password';
import { generatePassword, slugify } from '../common/venue-utils';

/** The ONE shared staff login of a branch. Created and managed only by the platform owner. */
@Injectable()
export class AdminStaffService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Branch) private branches: Repository<Branch>,
    private ds: DataSource,
  ) {}

  private async branchOrFail(branchId: string) {
    const b = await this.branches.findOne({ where: { id: branchId }, relations: { restaurant: true } });
    if (!b) throw new NotFoundException('Branch not found');
    return b;
  }

  private staffOf(branchId: string) {
    return this.users.findOne({ where: { branchId, role: 'staff' } });
  }

  /** Every branch of a venue with the status of its staff login (the password is never returned). */
  async listForVenue(venueId: string) {
    return this.ds.query(
      `SELECT b."id" AS "branchId", b."branchName", u."username", u."isActive", u."lastLoginAt"
         FROM "branches" b
         LEFT JOIN "users" u ON u."branchId" = b."id" AND u."role" = 'staff'
        WHERE b."restaurantId" = $1 ORDER BY b."createdAt"`,
      [venueId],
    );
  }

  /** Creates the branch login, e.g. kfc_salt_lake_staff. The password is shown ONCE. */
  async create(branchId: string) {
    const b = await this.branchOrFail(branchId);
    if (await this.staffOf(branchId)) {
      throw new ConflictException('This branch already has a staff login. Use reset password instead.');
    }
    const base = `${slugify(b.restaurant.name)}_${slugify(b.branchName, 'branch')}_staff`.replace(/-/g, '_');
    let username = base;
    for (let n = 2; await this.users.count({ where: { username } }); n++) username = `${base}_${n}`;
    const password = generatePassword();
    try {
      await this.users.save(this.users.create({
        restaurantId: b.restaurantId, branchId, name: `${b.restaurant.name} ${b.branchName} Staff`,
        username, email: null, passwordHash: await hashPassword(password), role: 'staff',
      }));
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('This branch already has a staff login.');
      throw e;
    }
    return { venue: b.restaurant.name, branch: b.branchName, username, password };
  }

  /** New password for the branch login. The old one stops working immediately. */
  async reset(branchId: string) {
    const b = await this.branchOrFail(branchId);
    const staff = await this.staffOf(branchId);
    if (!staff) throw new NotFoundException('This branch has no staff login yet');
    const password = generatePassword();
    await this.users.update(staff.id, { passwordHash: await hashPassword(password) });
    return { venue: b.restaurant.name, branch: b.branchName, username: staff.username, password };
  }

  /** Disable or enable the branch login. A disabled login cannot sign in. */
  async setActive(branchId: string, isActive: boolean) {
    await this.branchOrFail(branchId);
    const staff = await this.staffOf(branchId);
    if (!staff) throw new NotFoundException('This branch has no staff login yet');
    await this.users.update(staff.id, { isActive });
    return { username: staff.username, isActive };
  }
}