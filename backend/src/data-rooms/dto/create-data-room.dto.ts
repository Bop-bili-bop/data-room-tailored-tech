import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDataRoomDto {
  @ApiProperty({ example: 'Series A due diligence', minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({
    example: 'Documents shared with prospective investors',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
