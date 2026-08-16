import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFolderDto {
  @ApiProperty({ example: 'Financial documents', minLength: 1 })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({
    example: '017e6cae-fc50-407e-bf39-83aa2ba456df',
    format: 'uuid',
    description: 'Parent folder ID. Omit to create a room-level folder.',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
