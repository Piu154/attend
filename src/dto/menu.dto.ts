import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString() @MinLength(1) @MaxLength(80) name: string;
  @IsOptional() @IsInt() @Min(0) @Max(9999) sortOrder?: number;
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) name?: string;
  @IsOptional() @IsInt() @Min(0) @Max(9999) sortOrder?: number;
}

export class CreateItemDto {
  @IsString() @MinLength(1) @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100000) price: number;
  @IsOptional() @IsBoolean() isAvailable?: boolean;
}

export class UpdateItemDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100000) price?: number;
  @IsOptional() @IsBoolean() isAvailable?: boolean;
}
