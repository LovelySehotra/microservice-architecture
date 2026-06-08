import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(
    // Concept: Inject UsersService to query user profiles
    private readonly usersService: UsersService,
  ) {}

  // Concept: REST endpoint displaying current authenticated user profile, protected by Passport JwtGuard
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  // Concept: Route implementing RBAC using roles guard and custom roles decorator
  @Get('admin-only')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async getAdminData() {
    return {
      message: 'Welcome Admin! You have accessed a secure, restricted resource.',
    };
  }
}
