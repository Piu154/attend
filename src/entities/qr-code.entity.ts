import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RestaurantTable } from './restaurant-table.entity';

@Entity('qr_codes')
export class QrCode {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() tableId: string;
  @ManyToOne(() => RestaurantTable, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tableId' })
  table: RestaurantTable;
  @Column({ unique: true }) tokenHash: string;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) revokedAt: Date | null;
}
