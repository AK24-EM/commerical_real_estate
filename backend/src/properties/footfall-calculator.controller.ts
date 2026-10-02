import { Controller, Get, Query } from '@nestjs/common';
import { FootfallCalculatorService } from './footfall-calculator.service';

@Controller('footfall')
export class FootfallController {
  constructor(private readonly footfallService: FootfallCalculatorService) {}

  @Get('calculate')
  async calculate(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.footfallService.calculateFootfall({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    });
  }
}
