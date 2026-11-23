import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type RestaurantStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type TenantType = 'RESTAURANT' | 'MALL_FOOD_COURT';
export type PlanTier = 'STANDARD_3K' | 'PRO_5K' | 'MALL_15K';
export type PaymentStatus = 'due' | 'paid' | 'overdue';

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ unique: true }) email: string;
  @Column({ type: 'varchar', length: 30, nullable: true }) phone: string | null;
  @Column({ type: 'varchar', length: 300, nullable: true }) address: string | null;
  @Column({ type: 'varchar', length: 64, default: 'Asia/Kolkata' }) timezone: string;
  @Column({ type: 'varchar', length: 80, nullable: true }) slug: string | null;
  @Column({ type: 'varchar', length: 20, default: 'RESTAURANT' }) tenantType: TenantType;
  @Column({ type: 'varchar', length: 20, default: 'STANDARD_3K' }) planTier: PlanTier;
  @Column({ type: 'varchar', length: 10, default: 'due' }) paymentStatus: PaymentStatus;
  @Column({ type: 'date', nullable: true }) paidUntil: string | null;
  @Column({ type: 'varchar', default: 'pending' }) status: RestaurantStatus;
  @Column() ownerKeyHash: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}