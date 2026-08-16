import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  Delete,
  Patch,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { FoldersService } from './folders.service';

import { UpdateFolderDto } from './dto/update-folder.dto';
import { CreateFolderDto } from './dto/create-folder.dto';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@Controller('data-rooms/:dataRoomId/folders')
@UseGuards(JwtAuthGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  create(
    @Param('dataRoomId') dataRoomId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateFolderDto,
  ) {
    return this.foldersService.create(dataRoomId, req.user.id, dto);
  }

  @Get()
  findAll(
    @Param('dataRoomId') dataRoomId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.foldersService.findAll(dataRoomId, req.user.id);
  }

  @Get('tree')
  findTree(
    @Param('dataRoomId') dataRoomId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.foldersService.findTree(dataRoomId, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('dataRoomId') dataRoomId: string,
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.foldersService.update(dataRoomId, id, req.user.id, dto);
  }

  @Delete(':id')
  remove(
    @Param('dataRoomId') dataRoomId: string,
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.foldersService.remove(dataRoomId, id, req.user.id);
  }
}
