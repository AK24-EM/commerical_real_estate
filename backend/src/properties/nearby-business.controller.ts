import { Controller, Get, Query } from '@nestjs/common';
import { NearbyBusinessService } from './nearby-business.service';

@Controller('nearby-business')
export class NearbyBusinessController {
  constructor(private readonly nearbyBusinessService: NearbyBusinessService) {}

  @Get()
  async getNearbyBusinesses(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.nearbyBusinessService.getNearbyBusinesses(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseFloat(radius) : 1000,
    );
  }
}
