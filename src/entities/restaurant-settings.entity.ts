import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('restaurant_settings')
export class RestaurantSettings {
  @PrimaryColumn('uuid') restaurantId: string;
  @Column({ type: 'int', default: 120 }) reminderAfterSeconds: number;
  @Column({ type: 'int', default: 300 }) escalateAfterSeconds: number;
  @Column({ type: 'int', default: 600 }) overdueAfterSeconds: number;
  @Column({ type: 'int', default: 300 }) repeatEverySeconds: number;
  @Column({ type: 'int', default: 10 }) maxNotifications: number;
  @Column({ type: 'int', default: 120 }) customerRemindCooldownSeconds: number;
  @Column({ type: 'int', default: 30 }) autoCloseMinutes: number;
  @UpdateDateColumn() updatedAt: Date;
}