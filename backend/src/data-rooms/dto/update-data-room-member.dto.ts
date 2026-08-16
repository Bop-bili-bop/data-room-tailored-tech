import { IsEnum } from 'class-validator';

import { DataRoomMemberRole } from './add-data-room-member.dto';

export class UpdateDataRoomMemberDto {
  @IsEnum(DataRoomMemberRole)
  role!: DataRoomMemberRole;
}
