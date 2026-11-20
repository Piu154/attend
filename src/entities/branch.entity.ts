import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Restaurant } from './restaurant.entity';

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() restaurantId: string;
  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;
  @Column() branchName: string;
  @Column() address: string;
  @CreateDateColumn() createdAt: Date;
}
