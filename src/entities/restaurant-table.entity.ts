import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Branch } from './branch.entity';

@Entity('restaurant_tables')
export class RestaurantTable {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() branchId: string;
  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;
  @Column() tableNumber: string;
  @Column({ type: 'boolean', default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
}