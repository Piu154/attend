import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type UserRole = 'owner' | 'manager' | 'staff';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() restaurantId: string;
  @Column({ type: 'uuid', nullable: true }) branchId: string | null;
  @Column() name: string;
  @Column() email: string;
  @Column() passwordHash: string;
  @Column({ type: 'varchar' }) role: UserRole;
  @Column({ type: 'boolean', default: true }) isActive: boolean;
  @Column({ type: 'timestamptz', nullable: true }) lastLoginAt: Date | null;
  @CreateDateColumn() createdAt: Date;
}