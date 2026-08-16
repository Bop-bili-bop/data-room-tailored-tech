import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFolderDto {
  @ApiProperty({ example: 'Audited financials', minLength: 1 })
  @IsString()
  @MinLength(1)
  name!: string;
}
