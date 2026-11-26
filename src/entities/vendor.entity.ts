import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** A food court stall (used only by MALL_FOOD_COURT venues). */
@Entity('vendors')
export class Vendor {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() restaurantId: string;
  @Column({ type: 'varchar', length: 120 }) name: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) logoUrl: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) category: string | null;
  @Column({ type: 'boolean', default: true }) isOpen: boolean;
  @Column({ type: 'boolean', default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
}