import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    // Concept: Inject UsersService to fetch users during authentication
    private readonly usersService: UsersService,
    // Concept: Inject JwtService to generate and sign JWTs
    private readonly jwtService: JwtService,
  ) {}

  // Concept: Verify user credentials by matching plaintext password with database hash
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  // Concept: Generate a JWT payload containing essential user identity and authorization claims
  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
