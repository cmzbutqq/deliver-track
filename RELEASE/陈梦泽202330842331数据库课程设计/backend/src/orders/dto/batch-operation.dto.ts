import { IsArray, IsUUID } from 'class-validator';

export class BatchOperationDto {
  @IsArray()
  @IsUUID('4', { each: true })
  orderIds: string[];
}

