import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(
    // Concept: Inject AuthService to handle token signing and logins
    private readonly authService: AuthService,
    // Concept: Inject UsersService to register new users
    private readonly usersService: UsersService,
  ) {}

  // Concept: REST endpoint for client registration, saving the user using the UsersService
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // Concept: REST endpoint for authenticating credentials and issuing a session JWT
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }
}
