import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateFileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;
}
