import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { createReadStream } from 'node:fs';
import type { Request, Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateShareDto } from './dto/create-share.dto';
import { SharesService } from './shares.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@ApiTags('Shares')
@ApiBearerAuth('access-token')
@ApiParam({ name: 'dataRoomId', description: 'Data room ID', format: 'uuid' })
@Controller('data-rooms/:dataRoomId/shares')
@UseGuards(JwtAuthGuard)
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a public or permissioned share link' })
  create(
    @Param('dataRoomId') dataRoomId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateShareDto,
  ) {
    return this.sharesService.create(dataRoomId, req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List active share links for a data room' })
  findAll(
    @Param('dataRoomId') dataRoomId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sharesService.findAll(dataRoomId, req.user.id);
  }

  @Delete(':shareId')
  @ApiOperation({ summary: 'Revoke a share link' })
  @ApiParam({ name: 'shareId', description: 'Share ID', format: 'uuid' })
  revoke(
    @Param('dataRoomId') dataRoomId: string,
    @Param('shareId') shareId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sharesService.revoke(dataRoomId, shareId, req.user.id);
  }
}

@ApiTags('Shared links')
@Controller('shares')
export class SharedLinksController {
  constructor(private readonly sharesService: SharesService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Open a public share link' })
  @ApiParam({ name: 'token', description: 'Share token' })
  getPublicPayload(@Param('token') token: string) {
    return this.sharesService.getPublicPayload(token);
  }

  @Get(':token/permissioned')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Open a permissioned share link' })
  @ApiParam({ name: 'token', description: 'Share token' })
  getPermissionedPayload(
    @Param('token') token: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sharesService.getPermissionedPayload(token, req.user.id);
  }

  @Get(':token/files/:fileId/preview')
  @ApiOperation({ summary: 'Preview a file through a share link' })
  @ApiProduces('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
  @ApiParam({ name: 'token', description: 'Share token' })
  @ApiParam({ name: 'fileId', description: 'File ID', format: 'uuid' })
  async previewFile(
    @Param('token') token: string,
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const sharedFile = await this.sharesService.getSharedFile(token, fileId);

    res.set({
      'Content-Type': sharedFile.file.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(
        sharedFile.file.name,
      )}"`,
    });

    return new StreamableFile(createReadStream(sharedFile.path));
  }

  @Get(':token/files/:fileId/download')
  @ApiOperation({ summary: 'Download a file through a share link' })
  @ApiProduces('application/octet-stream')
  @ApiParam({ name: 'token', description: 'Share token' })
  @ApiParam({ name: 'fileId', description: 'File ID', format: 'uuid' })
  async downloadFile(
    @Param('token') token: string,
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const sharedFile = await this.sharesService.getSharedFile(token, fileId);

    res.set({
      'Content-Type': sharedFile.file.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(
        sharedFile.file.name,
      )}"`,
    });

    return new StreamableFile(createReadStream(sharedFile.path));
  }
}
