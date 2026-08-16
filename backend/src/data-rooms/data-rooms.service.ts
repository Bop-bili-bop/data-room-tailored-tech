import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { rm } from 'node:fs/promises';

import { PrismaService } from '../prisma/prisma.service';
import { StoragePathService } from '../storage/storage-path.service';
import { Prisma, type DataRoomMember } from '../generated/prisma/client';

import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { AddDataRoomMemberDto } from './dto/add-data-room-member.dto';
import { UpdateDataRoomDto } from './dto/update-data-room.dto';
import { UpdateDataRoomMemberDto } from './dto/update-data-room-member.dto';

@Injectable()
export class DataRoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storagePath: StoragePathService,
  ) {}

  create(userId: string, dto: CreateDataRoomDto) {
    return this.prisma.dataRoom.create({
      data: {
        name: dto.name,
        description: dto.description,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: true,
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.dataRoom.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const dataRoom = await this.prisma.dataRoom.findUnique({
      where: {
        id,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!dataRoom) {
      throw new NotFoundException('Data room not found');
    }

    const hasAccess = dataRoom.members.some(
      (member) => member.userId === userId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this data room');
    }

    return dataRoom;
  }

  async addMember(
    dataRoomId: string,
    currentUserId: string,
    dto: AddDataRoomMemberDto,
  ) {
    await this.ensureOwner(dataRoomId, currentUserId);

    const user = await this.prisma.user.findUnique({
      where: {
        id: dto.userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const dataRoom = await this.prisma.dataRoom.findUnique({
      where: {
        id: dataRoomId,
      },
    });

    if (!dataRoom) {
      throw new NotFoundException('Data room not found');
    }

    if (dataRoom.ownerId === dto.userId) {
      throw new ConflictException('Owner is already a member');
    }

    try {
      return await this.prisma.dataRoomMember.create({
        data: {
          dataRoomId,
          userId: dto.userId,
          role: dto.role,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'User is already a member of this data room',
        );
      }

      throw error;
    }
  }

  async findMembers(dataRoomId: string, currentUserId: string) {
    await this.ensureMember(dataRoomId, currentUserId);

    return this.prisma.dataRoomMember.findMany({
      where: {
        dataRoomId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async updateMember(
    dataRoomId: string,
    memberId: string,
    currentUserId: string,
    dto: UpdateDataRoomMemberDto,
  ) {
    await this.ensureOwner(dataRoomId, currentUserId);

    const member = await this.findDataRoomMemberById(dataRoomId, memberId);

    if (member.role === 'OWNER') {
      throw new ForbiddenException('Owner role cannot be changed');
    }

    return this.prisma.dataRoomMember.update({
      where: {
        id: memberId,
      },
      data: {
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async removeMember(
    dataRoomId: string,
    memberId: string,
    currentUserId: string,
  ) {
    await this.ensureOwner(dataRoomId, currentUserId);

    const member = await this.findDataRoomMemberById(dataRoomId, memberId);

    if (member.role === 'OWNER') {
      throw new ForbiddenException('Owner cannot be removed from data room');
    }

    await this.prisma.dataRoomMember.delete({
      where: {
        id: memberId,
      },
    });

    return {
      message: 'Member removed successfully',
    };
  }

  async update(
    dataRoomId: string,
    currentUserId: string,
    dto: UpdateDataRoomDto,
  ) {
    const member = await this.prisma.dataRoomMember.findUnique({
      where: {
        dataRoomId_userId: {
          dataRoomId,
          userId: currentUserId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this data room');
    }

    if (member.role !== 'OWNER') {
      throw new ForbiddenException('Only the owner can update this data room');
    }

    return this.prisma.dataRoom.update({
      where: {
        id: dataRoomId,
      },
      data: dto,
    });
  }

  async remove(dataRoomId: string, currentUserId: string) {
    const member = await this.prisma.dataRoomMember.findUnique({
      where: {
        dataRoomId_userId: {
          dataRoomId,
          userId: currentUserId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this data room');
    }

    if (member.role !== 'OWNER') {
      throw new ForbiddenException('Only the owner can delete this data room');
    }

    await this.prisma.dataRoom.delete({
      where: {
        id: dataRoomId,
      },
    });

    await this.removeDataRoomUploads(dataRoomId);

    return {
      message: 'Data room deleted successfully',
    };
  }

  private async ensureMember(
    dataRoomId: string,
    userId: string,
  ): Promise<DataRoomMember> {
    const member = await this.prisma.dataRoomMember.findUnique({
      where: {
        dataRoomId_userId: {
          dataRoomId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this data room');
    }

    return member;
  }

  private async ensureOwner(
    dataRoomId: string,
    userId: string,
  ): Promise<DataRoomMember> {
    const member = await this.ensureMember(dataRoomId, userId);

    if (member.role !== 'OWNER') {
      throw new ForbiddenException('Only the owner can manage data room');
    }

    return member;
  }

  private async findDataRoomMemberById(
    dataRoomId: string,
    memberId: string,
  ): Promise<DataRoomMember> {
    const member = await this.prisma.dataRoomMember.findFirst({
      where: {
        id: memberId,
        dataRoomId,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  private async removeDataRoomUploads(dataRoomId: string): Promise<void> {
    await rm(this.storagePath.resolve('data-rooms', dataRoomId), {
      recursive: true,
      force: true,
    });
  }
}
