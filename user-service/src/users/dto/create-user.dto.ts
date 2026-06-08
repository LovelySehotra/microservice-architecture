import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsString } from 'class-validator';

// Concept: Data Transfer Object (DTO) enforcing validation constraints on incoming HTTP requests
export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  role?: string;
}
