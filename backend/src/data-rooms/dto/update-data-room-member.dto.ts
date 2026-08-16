import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { DataRoomMemberRole } from './add-data-room-member.dto';

export class UpdateDataRoomMemberDto {
  @ApiProperty({ enum: DataRoomMemberRole, example: DataRoomMemberRole.EDITOR })
  @IsEnum(DataRoomMemberRole)
  role!: DataRoomMemberRole;
}
