import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type UserRole = 'owner' | 'manager' | 'staff' | 'vendor';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() restaurantId: string;
  @Column({ type: 'uuid', nullable: true }) branchId: string | null;
  @Column({ type: 'uuid', nullable: true }) vendorId: string | null;
  @Column() name: string;
  @Column({ type: 'varchar', length: 254, nullable: true }) email: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) username: string | null;
  @Column() passwordHash: string;
  @Column({ type: 'varchar' }) role: UserRole;
  @Column({ type: 'boolean', default: true }) isActive: boolean;
  @Column({ type: 'timestamptz', nullable: true }) lastLoginAt: Date | null;
  @CreateDateColumn() createdAt: Date;
}