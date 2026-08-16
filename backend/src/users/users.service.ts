import { Injectable } from '@nestjs/common';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type PublicUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  create(data: { email: string; password: string; name: string }) {
    return this.prisma.user.create({
      data,
    });
  }

  async findPublicById(id: string): Promise<PublicUser | null> {
    const user = await this.findById(id);

    if (!user) {
      return null;
    }

    return this.toPublicUser(user);
  }

  findAllPublic(search?: string): Promise<PublicUser[]> {
    return this.prisma.user.findMany({
      where: search
        ? {
            OR: [
              {
                email: {
                  contains: search,
                },
              },
              {
                name: {
                  contains: search,
                },
              },
            ],
          }
        : undefined,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });
  }

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
