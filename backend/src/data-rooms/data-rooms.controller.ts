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

@Controller('data-rooms')
@UseGuards(JwtAuthGuard)
export class DataRoomsController {
  constructor(private readonly dataRoomsService: DataRoomsService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateDataRoomDto) {
    return this.dataRoomsService.create(req.user.id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.dataRoomsService.findOne(id, req.user.id);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.dataRoomsService.findAll(req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateDataRoomDto,
  ) {
    return this.dataRoomsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.dataRoomsService.remove(id, req.user.id);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddDataRoomMemberDto,
  ) {
    return this.dataRoomsService.addMember(id, req.user.id, dto);
  }

  @Get(':id/members')
  findMembers(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.dataRoomsService.findMembers(id, req.user.id);
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateDataRoomMemberDto,
  ) {
    return this.dataRoomsService.updateMember(id, memberId, req.user.id, dto);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dataRoomsService.removeMember(id, memberId, req.user.id);
  }
}
