import {
  Controller,
  Get,
  NotFoundException,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { PublicUser } from './users.service';
import { UsersService } from './users.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@Req() req: AuthenticatedRequest): Promise<PublicUser> {
    const user = await this.usersService.findPublicById(req.user.id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  @Get()
  findAll(@Query('search') search?: string): Promise<PublicUser[]> {
    return this.usersService.findAllPublic(search);
  }
}
