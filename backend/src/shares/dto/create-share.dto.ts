import { IsEnum, IsUUID, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @ApiProperty({ enum: ShareTargetTypeDto, example: ShareTargetTypeDto.FOLDER })
  @IsEnum(ShareTargetTypeDto)
  targetType!: ShareTargetTypeDto;

  @ApiProperty({
    example: '017e6cae-fc50-407e-bf39-83aa2ba456df',
    format: 'uuid',
  })
  @IsUUID()
  targetId!: string;

  @ApiProperty({ enum: ShareModeDto, example: ShareModeDto.PERMISSIONED })
  @IsEnum(ShareModeDto)
  mode!: ShareModeDto;

  @ApiPropertyOptional({
    example: '8cbb12f7-ed25-49e9-b1bd-f352e3076536',
    format: 'uuid',
    description: 'Required when mode is PERMISSIONED.',
  })
  @ValidateIf((dto: CreateShareDto) => dto.mode === ShareModeDto.PERMISSIONED)
  @IsUUID()
  recipientUserId?: string;
}
