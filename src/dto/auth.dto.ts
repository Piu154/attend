import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsOptional() @IsString() @MaxLength(254) login?: string; 
  @IsOptional() @IsEmail() email?: string;                   
  @IsString() @MinLength(1) @MaxLength(100) password: string;
}

export class OwnerSetupDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) @MaxLength(100) password: string;
}