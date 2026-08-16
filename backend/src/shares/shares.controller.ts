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

@Controller('data-rooms/:dataRoomId/shares')
@UseGuards(JwtAuthGuard)
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Post()
  create(
    @Param('dataRoomId') dataRoomId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateShareDto,
  ) {
    return this.sharesService.create(dataRoomId, req.user.id, dto);
  }

  @Get()
  findAll(
    @Param('dataRoomId') dataRoomId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sharesService.findAll(dataRoomId, req.user.id);
  }

  @Delete(':shareId')
  revoke(
    @Param('dataRoomId') dataRoomId: string,
    @Param('shareId') shareId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sharesService.revoke(dataRoomId, shareId, req.user.id);
  }
}

@Controller('shares')
export class SharedLinksController {
  constructor(private readonly sharesService: SharesService) {}

  @Get(':token')
  getPublicPayload(@Param('token') token: string) {
    return this.sharesService.getPublicPayload(token);
  }

  @Get(':token/permissioned')
  @UseGuards(JwtAuthGuard)
  getPermissionedPayload(
    @Param('token') token: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sharesService.getPermissionedPayload(token, req.user.id);
  }

  @Get(':token/files/:fileId/preview')
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
