import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Post,
  Param,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  Req,
  UseGuards,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'node:fs';
import type { Express, Request, Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { File as PrismaFile } from '../generated/prisma/client';
import { FilesService } from './files.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@Controller('data-rooms')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post(':dataRoomId/folders/:folderId/files')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('dataRoomId') dataRoomId: string,
    @Param('folderId') folderId: string,
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<PrismaFile> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.filesService.create(dataRoomId, folderId, req.user.id, file);
  }

  @Get(':dataRoomId/folders/:folderId/files')
  findAll(
    @Param('dataRoomId') dataRoomId: string,
    @Param('folderId') folderId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<PrismaFile[]> {
    return this.filesService.findAll(dataRoomId, folderId, req.user.id);
  }

  @Get(':dataRoomId/files/:fileId/download')
  async download(
    @Param('dataRoomId') dataRoomId: string,
    @Param('fileId') fileId: string,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const downloadableFile = await this.filesService.getDownload(
      dataRoomId,
      fileId,
      req.user.id,
    );

    res.set({
      'Content-Type': downloadableFile.file.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(
        downloadableFile.file.originalName,
      )}"`,
    });

    return new StreamableFile(createReadStream(downloadableFile.path));
  }

  @Delete(':dataRoomId/files/:fileId')
  remove(
    @Param('dataRoomId') dataRoomId: string,
    @Param('fileId') fileId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    return this.filesService.remove(dataRoomId, fileId, req.user.id);
  }
}
