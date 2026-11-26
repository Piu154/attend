import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { SERVICES } from '../common/services'
export const REQUEST_TYPES = SERVICES.map((s) => s.key);

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
