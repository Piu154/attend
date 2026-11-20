import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuCategory } from '../entities/menu-category.entity';
import { MenuItem } from '../entities/menu-item.entity';
import { CreateCategoryDto, CreateItemDto, UpdateCategoryDto, UpdateItemDto } from '../dto/menu.dto';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuCategory) private cats: Repository<MenuCategory>,
    @InjectRepository(MenuItem) private items: Repository<MenuItem>,
  ) {}

  private itemView(i: MenuItem) {
    return { id: i.id, name: i.name, description: i.description, price: i.pricePaise / 100, isAvailable: i.isAvailable };
  }
  private catView(c: MenuCategory) {
    return { id: c.id, name: c.name, sortOrder: c.sortOrder };
  }

  /** onlyAvailable = customer view: hides unavailable items and empty categories. */
  async fullMenu(restaurantId: string, onlyAvailable = false) {
    const cats = await this.cats.find({ where: { restaurantId }, order: { sortOrder: 'ASC', createdAt: 'ASC' } });
    const items = await this.items.find({ where: { restaurantId }, order: { createdAt: 'ASC' } });
    const result = cats.map((c) => ({
      ...this.catView(c),
      items: items.filter((i) => i.categoryId === c.id && (!onlyAvailable || i.isAvailable)).map((i) => this.itemView(i)),
    }));
    return onlyAvailable ? result.filter((c) => c.items.length > 0) : result;
  }

  private async getCategory(restaurantId: string, id: string) {
    const c = await this.cats.findOne({ where: { id, restaurantId } });
    if (!c) throw new NotFoundException('Category not found');
    return c;
  }
  private async getItem(restaurantId: string, id: string) {
    const i = await this.items.findOne({ where: { id, restaurantId } });
    if (!i) throw new NotFoundException('Item not found');
    return i;
  }

  async createCategory(restaurantId: string, dto: CreateCategoryDto) {
    const c = await this.cats.save(this.cats.create({ restaurantId, name: dto.name.trim(), sortOrder: dto.sortOrder ?? 0 }));
    return this.catView(c);
  }

  async updateCategory(restaurantId: string, id: string, dto: UpdateCategoryDto) {
    const c = await this.getCategory(restaurantId, id);
    if (dto.name !== undefined) c.name = dto.name.trim();
    if (dto.sortOrder !== undefined) c.sortOrder = dto.sortOrder;
    return this.catView(await this.cats.save(c));
  }

  async deleteCategory(restaurantId: string, id: string) {
    const c = await this.getCategory(restaurantId, id);
    await this.cats.remove(c); // items are removed by FK cascade
    return { deleted: true };
  }

  async createItem(restaurantId: string, categoryId: string, dto: CreateItemDto) {
    await this.getCategory(restaurantId, categoryId);
    const i = await this.items.save(
      this.items.create({
        restaurantId, categoryId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        pricePaise: Math.round(dto.price * 100),
        isAvailable: dto.isAvailable ?? true,
      }),
    );
    return { ...this.itemView(i), categoryId };
  }

  async updateItem(restaurantId: string, id: string, dto: UpdateItemDto) {
    const i = await this.getItem(restaurantId, id);
    if (dto.name !== undefined) i.name = dto.name.trim();
    if (dto.description !== undefined) i.description = dto.description.trim() || null;
    if (dto.price !== undefined) i.pricePaise = Math.round(dto.price * 100);
    if (dto.isAvailable !== undefined) i.isAvailable = dto.isAvailable;
    return this.itemView(await this.items.save(i));
  }

  async deleteItem(restaurantId: string, id: string) {
    const i = await this.getItem(restaurantId, id);
    await this.items.remove(i);
    return { deleted: true };
  }
}
