import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  ShareMode as PrismaShareMode,
  ShareTargetType as PrismaShareTargetType,
} from '../generated/prisma/client';
import type {
  DataRoomMember,
  File as PrismaFile,
  Folder,
  Share,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateShareDto,
  ShareModeDto,
  ShareTargetTypeDto,
} from './dto/create-share.dto';

type FolderWithFiles = Folder & {
  files: PrismaFile[];
};

type FolderTreeNode = FolderWithFiles & {
  children: FolderTreeNode[];
};

type SharedPayload = {
  share: Share;
  target:
    | { type: 'DATA_ROOM'; room: unknown; folders: FolderTreeNode[] }
    | { type: 'FOLDER'; folder: FolderTreeNode }
    | {
        type: 'FILE';
        file: PrismaFile & { previewUrl: string; downloadUrl: string };
      };
};

@Injectable()
export class SharesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dataRoomId: string, userId: string, dto: CreateShareDto) {
    await this.ensureOwner(dataRoomId, userId);
    await this.ensureTargetBelongsToDataRoom(dataRoomId, dto);

    if (dto.mode === ShareModeDto.PERMISSIONED && !dto.recipientUserId) {
      throw new BadRequestException('Recipient user is required');
    }

    if (dto.recipientUserId) {
      const recipient = await this.prisma.user.findUnique({
        where: {
          id: dto.recipientUserId,
        },
        select: {
          id: true,
        },
      });

      if (!recipient) {
        throw new NotFoundException('Recipient user not found');
      }
    }

    return this.prisma.share.create({
      data: {
        dataRoomId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        mode: dto.mode,
        recipientUserId:
          dto.mode === ShareModeDto.PERMISSIONED ? dto.recipientUserId : null,
        createdById: userId,
        token: randomUUID(),
      },
      include: {
        recipientUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(dataRoomId: string, userId: string) {
    await this.ensureOwner(dataRoomId, userId);

    return this.prisma.share.findMany({
      where: {
        dataRoomId,
      },
      include: {
        recipientUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
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

  async revoke(dataRoomId: string, shareId: string, userId: string) {
    await this.ensureOwner(dataRoomId, userId);

    const share = await this.prisma.share.findFirst({
      where: {
        id: shareId,
        dataRoomId,
      },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    return this.prisma.share.update({
      where: {
        id: shareId,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async getPublicPayload(token: string): Promise<SharedPayload> {
    const share = await this.findActiveShare(token);

    if (share.mode !== PrismaShareMode.PUBLIC) {
      throw new ForbiddenException('This share requires permission');
    }

    return this.buildSharedPayload(share);
  }

  async getPermissionedPayload(
    token: string,
    userId: string,
  ): Promise<SharedPayload> {
    const share = await this.findActiveShare(token);

    if (
      share.mode !== PrismaShareMode.PERMISSIONED ||
      share.recipientUserId !== userId
    ) {
      throw new ForbiddenException('You do not have access to this share');
    }

    return this.buildSharedPayload(share);
  }

  async getSharedFile(token: string, fileId: string) {
    const share = await this.findActiveShare(token);

    if (share.mode !== PrismaShareMode.PUBLIC) {
      throw new ForbiddenException('This file requires permission');
    }

    const file = await this.findReadableSharedFile(share, fileId);
    const path = this.getUploadPath(file.storageKey);

    try {
      await access(path);
    } catch {
      throw new NotFoundException('Stored file not found');
    }

    return {
      file,
      path,
    };
  }

  private async buildSharedPayload(share: Share): Promise<SharedPayload> {
    if (share.targetType === PrismaShareTargetType.DATA_ROOM) {
      const room = await this.prisma.dataRoom.findUnique({
        where: {
          id: share.dataRoomId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!room) {
        throw new NotFoundException('Data room not found');
      }

      return {
        share,
        target: {
          type: 'DATA_ROOM',
          room,
          folders: await this.findFolderTree(share.dataRoomId, share.token),
        },
      };
    }

    if (share.targetType === PrismaShareTargetType.FOLDER) {
      const folders = await this.findFolderTree(share.dataRoomId, share.token);
      const folder = this.findFolderNode(folders, share.targetId);

      if (!folder) {
        throw new NotFoundException('Folder not found');
      }

      return {
        share,
        target: {
          type: 'FOLDER',
          folder,
        },
      };
    }

    const file = await this.findFileInDataRoom(
      share.dataRoomId,
      share.targetId,
    );

    return {
      share,
      target: {
        type: 'FILE',
        file: this.withSharedFileUrls(share.token, file),
      },
    };
  }

  private async findReadableSharedFile(
    share: Share,
    fileId: string,
  ): Promise<PrismaFile> {
    const file = await this.findFileInDataRoom(share.dataRoomId, fileId);

    if (share.targetType === PrismaShareTargetType.FILE) {
      if (share.targetId !== fileId) {
        throw new ForbiddenException('File is not part of this share');
      }

      return file;
    }

    if (share.targetType === PrismaShareTargetType.DATA_ROOM) {
      return file;
    }

    const folderIds = await this.collectFolderAndDescendantIds(
      share.dataRoomId,
      share.targetId,
    );

    if (!folderIds.includes(file.folderId)) {
      throw new ForbiddenException('File is not part of this share');
    }

    return file;
  }

  private async findFolderTree(
    dataRoomId: string,
    token: string,
  ): Promise<FolderTreeNode[]> {
    const folders = await this.prisma.folder.findMany({
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
    const folderMap = new Map<string, FolderTreeNode>();

    for (const folder of folders) {
      folderMap.set(folder.id, {
        ...folder,
        files: folder.files.map((file) => this.withSharedFileUrls(token, file)),
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

  private findFolderNode(
    folders: FolderTreeNode[],
    folderId: string,
  ): FolderTreeNode | null {
    for (const folder of folders) {
      if (folder.id === folderId) {
        return folder;
      }

      const child = this.findFolderNode(folder.children, folderId);

      if (child) {
        return child;
      }
    }

    return null;
  }

  private async ensureTargetBelongsToDataRoom(
    dataRoomId: string,
    dto: CreateShareDto,
  ): Promise<void> {
    if (dto.targetType === ShareTargetTypeDto.DATA_ROOM) {
      if (dto.targetId !== dataRoomId) {
        throw new BadRequestException('Data room target must match route');
      }

      return;
    }

    if (dto.targetType === ShareTargetTypeDto.FOLDER) {
      const folder = await this.prisma.folder.findFirst({
        where: {
          id: dto.targetId,
          dataRoomId,
        },
      });

      if (!folder) {
        throw new NotFoundException('Folder not found');
      }

      return;
    }

    const file = await this.prisma.file.findFirst({
      where: {
        id: dto.targetId,
        folder: {
          dataRoomId,
        },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }
  }

  private async ensureOwner(
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

    if (member.role !== 'OWNER') {
      throw new ForbiddenException('Only the owner can manage shares');
    }

    return member;
  }

  private async findActiveShare(token: string): Promise<Share> {
    const share = await this.prisma.share.findUnique({
      where: {
        token,
      },
    });

    if (!share || share.revokedAt) {
      throw new NotFoundException('Share not found');
    }

    return share;
  }

  private async findFileInDataRoom(
    dataRoomId: string,
    fileId: string,
  ): Promise<PrismaFile> {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        folder: {
          dataRoomId,
        },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
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

  private withSharedFileUrls<TFile extends PrismaFile>(
    token: string,
    file: TFile,
  ): TFile & { previewUrl: string; downloadUrl: string } {
    const prefix = token ? `/shares/${token}/files/${file.id}` : '';

    return {
      ...file,
      previewUrl: prefix ? `${prefix}/preview` : '',
      downloadUrl: prefix ? `${prefix}/download` : '',
    };
  }

  private getUploadPath(storageKey: string): string {
    return join(process.cwd(), 'uploads', storageKey);
  }
}
