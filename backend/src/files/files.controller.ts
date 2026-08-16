import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Res,
  StreamableFile,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Req,
  UseGuards,
} from '@nestjs/common';

import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'node:fs';
import type { Express, Request, Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { File as PrismaFile } from '../generated/prisma/client';
import { FilesService } from './files.service';
import { UpdateFileDto } from './dto/update-file.dto';

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

  @Post(':dataRoomId/folders/:folderId/files/bulk')
  @UseInterceptors(FilesInterceptor('files', 20))
  uploadMany(
    @Param('dataRoomId') dataRoomId: string,
    @Param('folderId') folderId: string,
    @Req() req: AuthenticatedRequest,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ): Promise<PrismaFile[]> {
    if (!files?.length) {
      throw new BadRequestException('At least one file is required');
    }

    return this.filesService.createMany(
      dataRoomId,
      folderId,
      req.user.id,
      files,
    );
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

  @Get(':dataRoomId/files/:fileId/preview')
  async preview(
    @Param('dataRoomId') dataRoomId: string,
    @Param('fileId') fileId: string,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const previewableFile = await this.filesService.getPreview(
      dataRoomId,
      fileId,
      req.user.id,
    );

    res.set({
      'Content-Type': previewableFile.file.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(
        previewableFile.file.name,
      )}"`,
    });

    return new StreamableFile(createReadStream(previewableFile.path));
  }

  @Patch(':dataRoomId/files/:fileId')
  update(
    @Param('dataRoomId') dataRoomId: string,
    @Param('fileId') fileId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateFileDto,
  ): Promise<PrismaFile> {
    return this.filesService.update(dataRoomId, fileId, req.user.id, dto);
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
