import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    // Concept: Dependency injection of PostgreSQL repository using TypeORM
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Concept: Business logic to register a new user and hash their password securely
  async create(createUserDto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email: createUserDto.email } });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      email: createUserDto.email,
      password: hashedPassword,
      role: createUserDto.role || 'user',
    });

    const saved = await this.userRepository.save(user);
    delete saved.password;
    return saved;
  }

  // Concept: Retrieve user profile by email for internal passport validation
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  // Concept: Retrieve user profile by ID for profile endpoints
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    delete user.password;
    return user;
  }
}
