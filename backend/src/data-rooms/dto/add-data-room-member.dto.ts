import { IsEnum, IsUUID } from 'class-validator';

export enum DataRoomMemberRole {
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export class AddDataRoomMemberDto {
  @IsUUID()
  userId!: string;

  @IsEnum(DataRoomMemberRole)
  role!: DataRoomMemberRole;
}
