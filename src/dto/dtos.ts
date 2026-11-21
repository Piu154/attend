import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterRestaurantDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsEmail() email: string;
  // Optional: when a password is sent, an owner login (email + password) is created too.
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) ownerName?: string;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(100) password?: string;
}

export class CreateBranchDto {
  @IsString() @MinLength(1) @MaxLength(120) branchName: string;
  @IsString() @MinLength(1) @MaxLength(300) address: string;
}

export class CreateTableDto {
  @IsString() @MinLength(1) @MaxLength(20) tableNumber: string;
}

export class StatusQueryDto {
  @IsOptional() @IsIn(['pending', 'approved', 'rejected', 'suspended']) status?: string;
}

export class FormatQueryDto {
  @IsOptional() @IsIn(['json', 'png']) format?: string;
}
