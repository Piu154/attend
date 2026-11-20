import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentRestaurant, RestaurantGuard } from '../common/restaurant.guard';
import { Restaurant } from '../entities/restaurant.entity';
import { MenuService } from '../services/menu.service';
import { CreateCategoryDto, CreateItemDto, UpdateCategoryDto, UpdateItemDto } from '../dto/menu.dto';

@Controller('menu')
@UseGuards(RestaurantGuard)
export class MenuController {
  constructor(private svc: MenuService) {}

  @Get() get(@CurrentRestaurant() r: Restaurant) { return this.svc.fullMenu(r.id); }

  @Post('categories')
  createCategory(@CurrentRestaurant() r: Restaurant, @Body() dto: CreateCategoryDto) { return this.svc.createCategory(r.id, dto); }

  @Patch('categories/:id')
  updateCategory(@CurrentRestaurant() r: Restaurant, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.svc.updateCategory(r.id, id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@CurrentRestaurant() r: Restaurant, @Param('id', ParseUUIDPipe) id: string) { return this.svc.deleteCategory(r.id, id); }

  @Post('categories/:categoryId/items')
  createItem(@CurrentRestaurant() r: Restaurant, @Param('categoryId', ParseUUIDPipe) categoryId: string, @Body() dto: CreateItemDto) {
    return this.svc.createItem(r.id, categoryId, dto);
  }

  @Patch('items/:id')
  updateItem(@CurrentRestaurant() r: Restaurant, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemDto) {
    return this.svc.updateItem(r.id, id, dto);
  }

  @Delete('items/:id')
  deleteItem(@CurrentRestaurant() r: Restaurant, @Param('id', ParseUUIDPipe) id: string) { return this.svc.deleteItem(r.id, id); }
}
