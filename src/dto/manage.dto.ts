import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateRestaurantDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
}

export class UpdateBranchDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) branchName?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(300) address?: string;
}

export class UpdateTableDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(20) tableNumber?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}