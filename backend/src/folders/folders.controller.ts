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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
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

@ApiTags('Folders')
@ApiBearerAuth('access-token')
@ApiParam({ name: 'dataRoomId', description: 'Data room ID', format: 'uuid' })
@Controller('data-rooms/:dataRoomId/folders')
@UseGuards(JwtAuthGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a folder' })
  create(
    @Param('dataRoomId') dataRoomId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateFolderDto,
  ) {
    return this.foldersService.create(dataRoomId, req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all folders in a data room' })
  findAll(
    @Param('dataRoomId') dataRoomId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.foldersService.findAll(dataRoomId, req.user.id);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get the nested folder tree' })
  findTree(
    @Param('dataRoomId') dataRoomId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.foldersService.findTree(dataRoomId, req.user.id);
  }

  @Get(':id/delete-impact')
  @ApiOperation({
    summary: 'Preview the impact of recursively deleting a folder',
  })
  @ApiParam({ name: 'id', description: 'Folder ID', format: 'uuid' })
  getDeleteImpact(
    @Param('dataRoomId') dataRoomId: string,
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.foldersService.getDeleteImpact(dataRoomId, id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a folder' })
  @ApiParam({ name: 'id', description: 'Folder ID', format: 'uuid' })
  update(
    @Param('dataRoomId') dataRoomId: string,
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.foldersService.update(dataRoomId, id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a folder and its contents' })
  @ApiParam({ name: 'id', description: 'Folder ID', format: 'uuid' })
  remove(
    @Param('dataRoomId') dataRoomId: string,
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.foldersService.remove(dataRoomId, id, req.user.id);
  }
}
