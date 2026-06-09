import { IsNotEmpty, IsString, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Concept: Input validation schema for items inside an order
export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

// Concept: Input validation DTO for order placement requests
export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
