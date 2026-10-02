import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PropertyService } from './property.service';
import { Property } from './property.entity';
import { Broker } from './broker.entity';
import { ListingLimitGuard } from './guards/listing-limit.guard';
import { CurrentBroker } from './decorators/current-broker.decorator';

@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Get()
  async getAllProperties(): Promise<Property[]> {
    return this.propertyService.findAll();
  }

  @Get('search')
  async searchProperties(
    @Query('query') query: string,
    @Query('type') type?: string,
    @Query('gst') gst?: string,
    @Query('power') power?: string,
    @Query('dock') dock?: string,
  ): Promise<any[]> {
    const properties = await this.propertyService.findAll();

    // Simple client-side filtering for demo
    return properties.filter(property => {
      if (query && !property.title.toLowerCase().includes(query.toLowerCase()) &&
          !property.city.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      if (type && property.propertyType !== type) return false;
      if (gst === 'true' && !property.isGstReady) return false;
      if (power === 'true' && !property.isPowerBackup) return false;
      if (dock === 'true' && !property.hasLoadingDock) return false;
      return true;
    });
  }

  @Get('nearby')
  async getNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius: string,
  ): Promise<Property[]> {
    return this.propertyService.findNearby(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius)
    );
  }

  @Get(':id')
  async getProperty(@Param('id') id: string): Promise<Property | null> {
    return this.propertyService.findOne(id);
  }

  @Post()
  @UseGuards(ListingLimitGuard)
  async createProperty(
    @Body() propertyData: Partial<Property>,
    @CurrentBroker() broker: Broker,
  ): Promise<Property> {
    console.log(`✅ Broker ${broker.businessName} (${broker.activeListingsCount}/${broker.listingLimit}) creating property`);
    return this.propertyService.create(propertyData);
  }

  @Put(':id')
  async updateProperty(
    @Param('id') id: string,
    @Body() propertyData: Partial<Property>,
  ): Promise<Property | null> {
    return this.propertyService.update(id, propertyData);
  }

  @Delete(':id')
  async deleteProperty(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.propertyService.delete(id);
    return { success };
  }
}
