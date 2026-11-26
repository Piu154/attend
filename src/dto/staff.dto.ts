import { IsBoolean } from 'class-validator';

export class StaffActiveDto {
  @IsBoolean() isActive: boolean;
}