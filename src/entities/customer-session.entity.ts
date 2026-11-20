import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('customer_sessions')
export class CustomerSession {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() tableId: string;
  @Column({ type: 'uuid', nullable: true }) qrCodeId: string | null;
  @Column({ unique: true }) sessionHash: string;
  @Column({ type: 'varchar', length: 300, nullable: true }) userAgent: string | null;
  @CreateDateColumn() createdAt: Date;
  @Column({ type: 'timestamptz', default: () => 'now()' }) lastSeenAt: Date;
  @Column({ type: 'timestamptz' }) expiresAt: Date;
}