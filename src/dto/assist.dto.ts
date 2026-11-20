import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const REQUEST_TYPES = ['staff', 'supplies', 'bill', 'other'];

export class CreateRequestDto {
  @IsIn(REQUEST_TYPES) type: string;
  @IsOptional() @IsString() @MaxLength(300) details?: string;
}
export class RejectRequestDto {
  @IsOptional() @IsString() @MaxLength(120) reason?: string;
}
export class QueueQueryDto {
  @IsOptional() @IsUUID() branchId?: string;
}
