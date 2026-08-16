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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
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

@ApiTags('Files')
@ApiBearerAuth('access-token')
@Controller('data-rooms')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post(':dataRoomId/folders/:folderId/files')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a PDF or image to a folder' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF or supported image file',
        },
      },
    },
  })
  @ApiParam({ name: 'dataRoomId', description: 'Data room ID', format: 'uuid' })
  @ApiParam({ name: 'folderId', description: 'Folder ID', format: 'uuid' })
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
  @ApiOperation({ summary: 'Upload up to 20 PDFs or images to a folder' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: {
          type: 'array',
          maxItems: 20,
          items: { type: 'string', format: 'binary' },
          description: 'PDF and supported image files',
        },
      },
    },
  })
  @ApiParam({ name: 'dataRoomId', description: 'Data room ID', format: 'uuid' })
  @ApiParam({ name: 'folderId', description: 'Folder ID', format: 'uuid' })
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
  @ApiOperation({ summary: 'List files in a folder' })
  @ApiParam({ name: 'dataRoomId', description: 'Data room ID', format: 'uuid' })
  @ApiParam({ name: 'folderId', description: 'Folder ID', format: 'uuid' })
  findAll(
    @Param('dataRoomId') dataRoomId: string,
    @Param('folderId') folderId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<PrismaFile[]> {
    return this.filesService.findAll(dataRoomId, folderId, req.user.id);
  }

  @Get(':dataRoomId/files/:fileId/download')
  @ApiOperation({ summary: 'Download the original file' })
  @ApiProduces('application/octet-stream')
  @ApiParam({ name: 'dataRoomId', description: 'Data room ID', format: 'uuid' })
  @ApiParam({ name: 'fileId', description: 'File ID', format: 'uuid' })
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
  @ApiOperation({ summary: 'Preview a PDF or image inline' })
  @ApiProduces('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
  @ApiParam({ name: 'dataRoomId', description: 'Data room ID', format: 'uuid' })
  @ApiParam({ name: 'fileId', description: 'File ID', format: 'uuid' })
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
  @ApiOperation({ summary: 'Rename or move a file' })
  @ApiParam({ name: 'dataRoomId', description: 'Data room ID', format: 'uuid' })
  @ApiParam({ name: 'fileId', description: 'File ID', format: 'uuid' })
  update(
    @Param('dataRoomId') dataRoomId: string,
    @Param('fileId') fileId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateFileDto,
  ): Promise<PrismaFile> {
    return this.filesService.update(dataRoomId, fileId, req.user.id, dto);
  }

  @Delete(':dataRoomId/files/:fileId')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiParam({ name: 'dataRoomId', description: 'Data room ID', format: 'uuid' })
  @ApiParam({ name: 'fileId', description: 'File ID', format: 'uuid' })
  remove(
    @Param('dataRoomId') dataRoomId: string,
    @Param('fileId') fileId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    return this.filesService.remove(dataRoomId, fileId, req.user.id);
  }
}
