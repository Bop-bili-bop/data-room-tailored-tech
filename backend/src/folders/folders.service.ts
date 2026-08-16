import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import { PrismaService } from '../prisma/prisma.service';
import type {
  DataRoomMember,
  File as PrismaFile,
  Folder,
} from '../generated/prisma/client';

import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

type FolderWithFiles = Folder & {
  files: PrismaFile[];
};

type FolderTreeNode = FolderWithFiles & {
  children: FolderTreeNode[];
};

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dataRoomId: string, userId: string, dto: CreateFolderDto) {
    const member = await this.getDataRoomMember(dataRoomId, userId);

    if (member.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot create folders');
    }

    if (dto.parentId) {
      const parentFolder = await this.prisma.folder.findFirst({
        where: {
          id: dto.parentId,
          dataRoomId,
        },
      });

      if (!parentFolder) {
        throw new NotFoundException('Parent folder not found');
      }
    }

    const name = await this.resolveAvailableFolderName(
      dataRoomId,
      dto.parentId ?? null,
      dto.name,
    );

    return this.prisma.folder.create({
      data: {
        name,
        dataRoomId,
        parentId: dto.parentId,
      },
    });
  }

  async findAll(dataRoomId: string, userId: string) {
    await this.getDataRoomMember(dataRoomId, userId);

    return this.prisma.folder.findMany({
      where: {
        dataRoomId,
      },
      include: {
        files: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findTree(
    dataRoomId: string,
    userId: string,
  ): Promise<FolderTreeNode[]> {
    const folders = await this.findAll(dataRoomId, userId);
    const folderMap = new Map<string, FolderTreeNode>();

    for (const folder of folders) {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
      });
    }

    const roots: FolderTreeNode[] = [];

    for (const folder of folderMap.values()) {
      if (folder.parentId) {
        folderMap.get(folder.parentId)?.children.push(folder);
      } else {
        roots.push(folder);
      }
    }

    return roots;
  }

  async update(
    dataRoomId: string,
    folderId: string,
    userId: string,
    dto: UpdateFolderDto,
  ) {
    const folder = await this.prisma.folder.findUnique({
      where: {
        id: folderId,
      },
      include: {
        dataRoom: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if (folder.dataRoomId !== dataRoomId) {
      throw new NotFoundException('Folder not found');
    }

    const member = folder.dataRoom.members.find((m) => m.userId === userId);

    if (!member) {
      throw new ForbiddenException('You do not have access to this data room');
    }

    if (member.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot update folders');
    }

    const name = await this.resolveAvailableFolderName(
      dataRoomId,
      folder.parentId,
      dto.name,
      folderId,
    );

    return this.prisma.folder.update({
      where: {
        id: folderId,
      },
      data: {
        name,
      },
    });
  }

  async getDeleteImpact(dataRoomId: string, folderId: string, userId: string) {
    const member = await this.getDataRoomMember(dataRoomId, userId);
    if (member.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot delete folders');
    }

    await this.ensureFolderInDataRoom(dataRoomId, folderId);

    const folderIds = await this.collectFolderAndDescendantIds(
      dataRoomId,
      folderId,
    );
    const fileCount = await this.prisma.file.count({
      where: {
        folderId: {
          in: folderIds,
        },
      },
    });

    return {
      folderCount: folderIds.length,
      fileCount,
    };
  }

  async remove(dataRoomId: string, folderId: string, userId: string) {
    const folder = await this.prisma.folder.findUnique({
      where: {
        id: folderId,
      },
      include: {
        dataRoom: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if (folder.dataRoomId !== dataRoomId) {
      throw new NotFoundException('Folder not found');
    }

    const member = folder.dataRoom.members.find((m) => m.userId === userId);

    if (!member) {
      throw new ForbiddenException('You do not have access to this data room');
    }

    if (member.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot delete folders');
    }

    const folderIds = await this.collectFolderAndDescendantIds(
      dataRoomId,
      folderId,
    );

    await this.prisma.folder.delete({
      where: {
        id: folderId,
      },
    });

    await Promise.all(
      folderIds.map((id) => this.removeFolderUploads(dataRoomId, id)),
    );

    return {
      message: 'Folder deleted successfully',
    };
  }

  private async getDataRoomMember(
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

  private async ensureFolderInDataRoom(
    dataRoomId: string,
    folderId: string,
  ): Promise<void> {
    const folder = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        dataRoomId,
      },
      select: {
        id: true,
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
  }

  private async resolveAvailableFolderName(
    dataRoomId: string,
    parentId: string | null,
    requestedName: string,
    excludeFolderId?: string,
  ): Promise<string> {
    const baseName = requestedName.trim();
    const siblings = await this.prisma.folder.findMany({
      where: {
        dataRoomId,
        parentId,
        ...(excludeFolderId
          ? {
              id: {
                not: excludeFolderId,
              },
            }
          : {}),
      },
      select: {
        name: true,
      },
    });
    const usedNames = new Set(siblings.map((folder) => folder.name));

    if (!usedNames.has(baseName)) {
      return baseName;
    }

    let suffix = 2;
    let candidate = `${baseName} (${suffix})`;

    while (usedNames.has(candidate)) {
      suffix += 1;
      candidate = `${baseName} (${suffix})`;
    }

    return candidate;
  }

  private async collectFolderAndDescendantIds(
    dataRoomId: string,
    folderId: string,
  ): Promise<string[]> {
    const folders = await this.prisma.folder.findMany({
      where: {
        dataRoomId,
      },
      select: {
        id: true,
        parentId: true,
      },
    });

    const childrenByParentId = new Map<string, string[]>();

    for (const folder of folders) {
      if (!folder.parentId) {
        continue;
      }

      const children = childrenByParentId.get(folder.parentId) ?? [];
      children.push(folder.id);
      childrenByParentId.set(folder.parentId, children);
    }

    const folderIds = [folderId];

    for (let index = 0; index < folderIds.length; index += 1) {
      const currentFolderId = folderIds[index];
      folderIds.push(...(childrenByParentId.get(currentFolderId) ?? []));
    }

    return folderIds;
  }

  private async removeFolderUploads(
    dataRoomId: string,
    folderId: string,
  ): Promise<void> {
    await rm(
      join(
        process.cwd(),
        'uploads',
        'data-rooms',
        dataRoomId,
        'folders',
        folderId,
      ),
      {
        recursive: true,
        force: true,
      },
    );
  }
}
