import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../entities/branch.entity';
import { CreateBranchDto } from '../dto/dtos';
import { UpdateBranchDto } from '../dto/manage.dto';

@Injectable()
export class BranchesService {
  constructor(@InjectRepository(Branch) private repo: Repository<Branch>) {}

  create(restaurantId: string, dto: CreateBranchDto) {
    return this.repo.save(this.repo.create({ restaurantId, branchName: dto.branchName.trim(), address: dto.address.trim() }));
  }

  list(restaurantId: string) {
    return this.repo.find({ where: { restaurantId }, order: { createdAt: 'ASC' } });
  }

  async getOwned(restaurantId: string, branchId: string) {
    const b = await this.repo.findOne({ where: { id: branchId, restaurantId } });
    if (!b) throw new NotFoundException('Branch not found');
    return b;
  }

  async update(restaurantId: string, id: string, dto: UpdateBranchDto) {
    const b = await this.getOwned(restaurantId, id);
    if (dto.branchName !== undefined) b.branchName = dto.branchName.trim();
    if (dto.address !== undefined) b.address = dto.address.trim();
    return this.repo.save(b);
  }
}