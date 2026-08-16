import { Global, Module } from '@nestjs/common';

import { StoragePathService } from './storage-path.service';

@Global()
@Module({
  providers: [StoragePathService],
  exports: [StoragePathService],
})
export class StorageModule {}
