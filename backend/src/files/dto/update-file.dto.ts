import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFileDto {
  @ApiPropertyOptional({ example: 'Q4-report.pdf', minLength: 1 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({
    example: '017e6cae-fc50-407e-bf39-83aa2ba456df',
    format: 'uuid',
    description: 'Destination folder ID.',
  })
  @IsOptional()
  @IsUUID()
  folderId?: string;
}
