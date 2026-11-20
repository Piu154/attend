import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('request_status_history')
export class RequestStatusHistory {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() requestId: string;
  @Column({ type: 'varchar', length: 20, nullable: true }) fromStatus: string | null;
  @Column({ type: 'varchar', length: 20 }) toStatus: string;
  @Column({ type: 'varchar', length: 20 }) changedByType: 'customer' | 'staff' | 'system';
  @Column({ type: 'uuid', nullable: true }) changedByUserId: string | null;
  @Column({ type: 'varchar', length: 200, nullable: true }) note: string | null;
  @CreateDateColumn() createdAt: Date;
}