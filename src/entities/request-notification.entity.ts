import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type NotificationKind = 'new' | 'reminder' | 'escalation' | 'overdue' | 'customer_reminder';
export type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'cancelled';

@Entity('request_notifications')
export class RequestNotification {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() requestId: string;
  @Column() restaurantId: string;
  @Column({ type: 'varchar' }) kind: NotificationKind;
  @Column({ type: 'varchar', default: 'socket' }) channel: 'socket' | 'push' | 'email';
  @Column({ type: 'uuid', nullable: true }) recipientUserId: string | null;
  @Column({ type: 'varchar', default: 'queued' }) status: NotificationStatus;
  @Column({ type: 'timestamptz', default: () => 'now()' }) scheduledFor: Date;
  @Column({ type: 'timestamptz', nullable: true }) sentAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) readAt: Date | null;
  @Column({ type: 'text', nullable: true }) error: string | null;
  @CreateDateColumn() createdAt: Date;
}