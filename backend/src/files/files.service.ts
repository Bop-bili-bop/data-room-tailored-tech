import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Express } from 'express';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

import type {
  DataRoomMember,
  File as PrismaFile,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_FILE_TYPES = new Map<string, readonly string[]>([
  ['application/pdf', ['.pdf']],
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['image/webp', ['.webp']],
  ['image/gif', ['.gif']],
]);
const MAX_FILE_SIZE_IN_BYTES = 20 * 1024 * 1024;

type DownloadableFile = {
  file: PrismaFile;
  path: string;
};

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dataRoomId: string,
    folderId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<PrismaFile> {
    this.validateUploadFile(file);

    const member = await this.getDataRoomMember(dataRoomId, userId);
    if (member.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot upload files');
    }

    await this.ensureFolderExists(dataRoomId, folderId);

    const safeFileName = this.createStoredFileName(file.originalname);
    const storageKey = join(
      'data-rooms',
      dataRoomId,
      'folders',
      folderId,
      safeFileName,
    );
    const uploadPath = join(process.cwd(), 'uploads', storageKey);

    await mkdir(
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
      },
    );
    await writeFile(uploadPath, file.buffer);

    try {
      return await this.prisma.file.create({
        data: {
          name: file.originalname,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          storageKey,
          folderId,
          uploadedById: userId,
        },
      });
    } catch (error) {
      await unlink(uploadPath);
      throw error;
    }
  }

  async findAll(
    dataRoomId: string,
    folderId: string,
    userId: string,
  ): Promise<PrismaFile[]> {
    await this.getDataRoomMember(dataRoomId, userId);
    await this.ensureFolderExists(dataRoomId, folderId);

    return this.prisma.file.findMany({
      where: {
        folderId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getDownload(
    dataRoomId: string,
    fileId: string,
    userId: string,
  ): Promise<DownloadableFile> {
    await this.getDataRoomMember(dataRoomId, userId);

    const file = await this.findFileInDataRoom(dataRoomId, fileId);
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

  async remove(
    dataRoomId: string,
    fileId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const member = await this.getDataRoomMember(dataRoomId, userId);
    if (member.role === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot delete files');
    }

    const file = await this.findFileInDataRoom(dataRoomId, fileId);
    const path = this.getUploadPath(file.storageKey);

    await this.prisma.file.delete({
      where: {
        id: fileId,
      },
    });

    try {
      await unlink(path);
    } catch {
      // If the physical file is already gone, the database deletion is still valid.
    }

    return {
      message: 'File deleted successfully',
    };
  }

  private validateUploadFile(file: Express.Multer.File): void {
    const allowedExtensions = ALLOWED_FILE_TYPES.get(file.mimetype);
    const extension = extname(file.originalname).toLowerCase();

    if (!allowedExtensions || !allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        'Only PDF and image files are allowed: pdf, jpg, jpeg, png, webp, gif',
      );
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('File is empty');
    }

    if (file.size > MAX_FILE_SIZE_IN_BYTES) {
      throw new BadRequestException('File size must not exceed 20 MB');
    }
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

  private async ensureFolderExists(
    dataRoomId: string,
    folderId: string,
  ): Promise<void> {
    const folder = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        dataRoomId,
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
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

  private getUploadPath(storageKey: string): string {
    return join(process.cwd(), 'uploads', storageKey);
  }

  private createStoredFileName(originalName: string): string {
    const extension = extname(originalName);
    const baseName = originalName
      .slice(0, originalName.length - extension.length)
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();

    return `${randomUUID()}-${baseName || 'file'}${extension.toLowerCase()}`;
  }
}
