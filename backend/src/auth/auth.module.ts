import { Module } from '@nestjs/common';
import { GstService } from './gst.service';
import { GstController } from './gst.controller';

@Module({
  controllers: [GstController],
  providers: [GstService],
})
export class AuthModule {}
