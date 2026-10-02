import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { LeaseCalculatorService, LeaseCalculationRequest, SaveQuoteDto } from './lease-calculator.service';

@Controller('lease-calculator')
export class LeaseCalculatorController {
  constructor(private readonly calculatorService: LeaseCalculatorService) {}

  @Post('calculate')
  calculate(@Body() request: LeaseCalculationRequest) {
    return this.calculatorService.calculateLease(request);
  }

  @Post('quotes')
  saveQuote(@Body() dto: SaveQuoteDto) {
    return this.calculatorService.saveQuote(dto);
  }

  @Get('quotes')
  getAllQuotes() {
    return this.calculatorService.getAllQuotes();
  }

  @Get('quotes/:id')
  getQuote(@Param('id') id: string) {
    return this.calculatorService.getQuote(id);
  }

  @Get('quotes/:id/cfo-report')
  getCfoReport(@Param('id') id: string) {
    return this.calculatorService.getCfoReport(id);
  }
}
