import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAbsolute, join, resolve } from 'node:path';

@Injectable()
export class StoragePathService {
  readonly uploadsRoot: string;

  constructor(configService: ConfigService) {
    const configuredRoot =
      configService.get<string>('UPLOADS_DIR') ??
      configService.get<string>('RAILWAY_VOLUME_MOUNT_PATH') ??
      'uploads';

    this.uploadsRoot = isAbsolute(configuredRoot)
      ? configuredRoot
      : resolve(process.cwd(), configuredRoot);
  }

  resolve(...segments: string[]): string {
    return join(this.uploadsRoot, ...segments);
  }
}
