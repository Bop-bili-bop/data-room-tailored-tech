import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DataRoomMemberRole {
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export class AddDataRoomMemberDto {
  @ApiProperty({
    example: '8cbb12f7-ed25-49e9-b1bd-f352e3076536',
    format: 'uuid',
  })
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: DataRoomMemberRole, example: DataRoomMemberRole.VIEWER })
  @IsEnum(DataRoomMemberRole)
  role!: DataRoomMemberRole;
}
