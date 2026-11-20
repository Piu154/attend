import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Branch } from './branch.entity';
import { RestaurantTable } from './restaurant-table.entity';

// Old values (staff, supplies, other, approved, rejected, expired) stay valid until Phase 5.
export type RequestType =
  | 'staff' | 'supplies' | 'bill' | 'other'
  | 'call_waiter' | 'water' | 'menu' | 'cleaning' | 'assistance';
export type RequestStatus =
  | 'pending' | 'approved' | 'rejected' | 'completed' | 'expired'
  | 'accepted' | 'in_progress' | 'cancelled';

@Entity('assist_requests')
export class AssistRequest {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() restaurantId: string;
  @Column() branchId: string;
  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;
  @Column() tableId: string;
  @ManyToOne(() => RestaurantTable, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tableId' })
  table: RestaurantTable;
  @Column({ type: 'uuid', nullable: true }) sessionId: string | null;
  @Column({ type: 'varchar' }) type: RequestType;
  @Column({ type: 'text', nullable: true }) details: string | null;
  @Column({ type: 'varchar', default: 'pending' }) status: RequestStatus;
  @Column({ type: 'uuid', nullable: true }) acceptedBy: string | null;
  @Column({ type: 'int', default: 0 }) reminders: number;
  @Column({ type: 'timestamptz', nullable: true }) remindedAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) approvedAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) closedAt: Date | null;
  @Column({ type: 'varchar', nullable: true }) rejectReason: string | null;
  @Column({ type: 'varchar', nullable: true }) closedBy: 'customer' | 'staff' | 'timeout' | null;
  @Column({ type: 'smallint', default: 0 }) escalationLevel: number;
  @Column({ type: 'boolean', default: false }) isOverdue: boolean;
  @Column({ type: 'timestamptz', nullable: true }) overdueAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}