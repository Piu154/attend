import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type RestaurantStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ unique: true }) email: string;
  @Column({ type: 'varchar', length: 30, nullable: true }) phone: string | null;
  @Column({ type: 'varchar', length: 300, nullable: true }) address: string | null;
  @Column({ type: 'varchar', length: 64, default: 'Asia/Kolkata' }) timezone: string;
  @Column({ type: 'varchar', default: 'pending' }) status: RestaurantStatus;
  @Column() ownerKeyHash: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}