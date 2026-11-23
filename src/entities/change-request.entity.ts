import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type ChangeKind = 'new_table' | 'replace_qr' | 'disable_table' | 'other';

/** A venue asking the platform owner for a change (new table, replace a QR, close a table). */
@Entity('change_requests')
export class ChangeRequest {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() restaurantId: string;
  @Column({ type: 'varchar' }) kind: ChangeKind;
  @Column({ type: 'varchar', length: 500 }) message: string;
  @Column({ type: 'varchar', default: 'open' }) status: 'open' | 'done';
  @CreateDateColumn() createdAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) resolvedAt: Date | null;
}