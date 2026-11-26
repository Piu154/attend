import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength,
} from 'class-validator';

const TENANTS = ['RESTAURANT', 'MALL_FOOD_COURT'];
const PLANS = ['STANDARD_3K', 'PRO_5K', 'MALL_15K'];

export class CreateVenueDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsEmail() email: string; // the shared login of the venue
  @IsIn(TENANTS) tenantType: string;
  @IsIn(PLANS) planTier: string;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(100) password?: string; // generated when left empty
}

export class UpdateVenueDto {
  @IsOptional() @IsIn(PLANS) planTier?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
}

export class PaymentDto {
  @IsIn(['paid', 'due', 'overdue']) action: string;
  @IsOptional() @IsDateString() paidUntil?: string; // for "paid"; defaults to one month from today
}

export class AdminTablesDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200)
  @IsString({ each: true }) @MinLength(1, { each: true }) @MaxLength(20, { each: true })
  tableNumbers: string[];
}