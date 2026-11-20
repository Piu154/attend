import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Restaurant } from './restaurant.entity';

@Entity('menu_categories')
export class MenuCategory {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() restaurantId: string;
  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;
  @Column() name: string;
  @Column({ type: 'int', default: 0 }) sortOrder: number;
  @CreateDateColumn() createdAt: Date;
}
