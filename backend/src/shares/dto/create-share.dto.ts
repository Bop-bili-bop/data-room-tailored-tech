import { IsEnum, IsUUID, ValidateIf } from 'class-validator';

export enum ShareTargetTypeDto {
  DATA_ROOM = 'DATA_ROOM',
  FOLDER = 'FOLDER',
  FILE = 'FILE',
}

export enum ShareModeDto {
  PUBLIC = 'PUBLIC',
  PERMISSIONED = 'PERMISSIONED',
}

export class CreateShareDto {
  @IsEnum(ShareTargetTypeDto)
  targetType!: ShareTargetTypeDto;

  @IsUUID()
  targetId!: string;

  @IsEnum(ShareModeDto)
  mode!: ShareModeDto;

  @ValidateIf((dto: CreateShareDto) => dto.mode === ShareModeDto.PERMISSIONED)
  @IsUUID()
  recipientUserId?: string;
}
