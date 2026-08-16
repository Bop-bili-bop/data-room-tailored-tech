import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

import { UsersService } from '../users/users.service';
import type { PublicUser } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type AuthResponse = {
  accessToken: string;
  user: PublicUser;
};

export type GoogleOAuthProfile = {
  email: string;
  name: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
    });

    return this.generateAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateAuthResponse(user);
  }

  async loginWithGoogle(profile: GoogleOAuthProfile): Promise<AuthResponse> {
    const existingUser = await this.usersService.findByEmail(profile.email);

    if (existingUser) {
      return this.generateAuthResponse(existingUser);
    }

    const generatedPassword = randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(generatedPassword, 12);
    const user = await this.usersService.create({
      email: profile.email,
      password: hashedPassword,
      name: profile.name,
    });

    return this.generateAuthResponse(user);
  }

  private generateToken(userId: string, email: string) {
    return {
      accessToken: this.jwtService.sign({
        sub: userId,
        email,
      }),
    };
  }

  private generateAuthResponse(user: {
    id: string;
    email: string;
    password: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }): AuthResponse {
    return {
      ...this.generateToken(user.id, user.email),
      user: this.usersService.toPublicUser(user),
    };
  }
}
