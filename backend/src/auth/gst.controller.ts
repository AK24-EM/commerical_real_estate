import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { GstService } from './gst.service';

@Controller('gst')
export class GstController {
  constructor(private readonly gstService: GstService) {}

  @Post('validate')
  validate(@Body('gstin') gstin: string) {
    return this.gstService.validateGstinFormat(gstin);
  }

  @Get('verify')
  async verify(@Query('gstin') gstin: string) {
    return this.gstService.verifyWithPublicApi(gstin);
  }
}
