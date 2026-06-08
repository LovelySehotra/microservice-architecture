import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

// Concept: Data Transfer Object (DTO) enforcing format and type validation for incoming product payloads
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsString()
  @IsOptional()
  description?: string;
}
