import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDataRoomDto {
  @ApiPropertyOptional({ example: 'Series A due diligence', minLength: 2 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated room description' })
  @IsOptional()
  @IsString()
  description?: string;
}
