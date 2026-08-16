import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DataRoomsService } from './data-rooms.service';

import { AddDataRoomMemberDto } from './dto/add-data-room-member.dto';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { UpdateDataRoomDto } from './dto/update-data-room.dto';
import { UpdateDataRoomMemberDto } from './dto/update-data-room-member.dto';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@ApiTags('Data rooms')
@ApiBearerAuth('access-token')
@Controller('data-rooms')
@UseGuards(JwtAuthGuard)
export class DataRoomsController {
  constructor(private readonly dataRoomsService: DataRoomsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a data room' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateDataRoomDto) {
    return this.dataRoomsService.create(req.user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a data room by ID' })
  @ApiParam({ name: 'id', description: 'Data room ID', format: 'uuid' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.dataRoomsService.findOne(id, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List data rooms available to the current user' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.dataRoomsService.findAll(req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a data room' })
  @ApiParam({ name: 'id', description: 'Data room ID', format: 'uuid' })
  update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateDataRoomDto,
  ) {
    return this.dataRoomsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a data room' })
  @ApiParam({ name: 'id', description: 'Data room ID', format: 'uuid' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.dataRoomsService.remove(id, req.user.id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to a data room' })
  @ApiParam({ name: 'id', description: 'Data room ID', format: 'uuid' })
  addMember(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddDataRoomMemberDto,
  ) {
    return this.dataRoomsService.addMember(id, req.user.id, dto);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List data room members' })
  @ApiParam({ name: 'id', description: 'Data room ID', format: 'uuid' })
  findMembers(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.dataRoomsService.findMembers(id, req.user.id);
  }

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: 'Change a data room member role' })
  @ApiParam({ name: 'id', description: 'Data room ID', format: 'uuid' })
  @ApiParam({ name: 'memberId', description: 'Membership ID', format: 'uuid' })
  updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateDataRoomMemberDto,
  ) {
    return this.dataRoomsService.updateMember(id, memberId, req.user.id, dto);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from a data room' })
  @ApiParam({ name: 'id', description: 'Data room ID', format: 'uuid' })
  @ApiParam({ name: 'memberId', description: 'Membership ID', format: 'uuid' })
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dataRoomsService.removeMember(id, memberId, req.user.id);
  }
}
