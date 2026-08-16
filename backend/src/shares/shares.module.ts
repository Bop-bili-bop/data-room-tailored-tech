import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { SharesController, SharedLinksController } from './shares.controller';
import { SharesService } from './shares.service';

@Module({
  imports: [PrismaModule],
  controllers: [SharesController, SharedLinksController],
  providers: [SharesService],
})
export class SharesModule {}
