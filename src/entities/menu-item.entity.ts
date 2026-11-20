import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MenuCategory } from './menu-category.entity';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() categoryId: string;
  @ManyToOne(() => MenuCategory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: MenuCategory;
  @Column() restaurantId: string;
  @Column() name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'int' }) pricePaise: number; // price x 100, avoids decimal bugs
  @Column({ type: 'boolean', default: true }) isAvailable: boolean;
  @CreateDateColumn() createdAt: Date;
}
