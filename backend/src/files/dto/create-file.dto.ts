import { IsUUID } from 'class-validator';

export class CreateFileDto {
  @IsUUID()
  folderId!: string;
}
