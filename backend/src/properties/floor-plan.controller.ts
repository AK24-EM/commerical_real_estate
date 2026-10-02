import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { FloorPlanService } from './floor-plan.service';

@Controller('properties')
export class FloorPlanController {
  constructor(private readonly floorPlanService: FloorPlanService) {}

  @Get(':propertyId/floor-plan')
  async getFloorPlan(@Param('propertyId') propertyId: string) {
    try {
      const floorPlan = await this.floorPlanService.getFloorPlanByPropertyId(propertyId);
      
      if (!floorPlan) {
        throw new HttpException('Floor plan not found', HttpStatus.NOT_FOUND);
      }
      
      return floorPlan;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch floor plan',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':propertyId/floor-plans')
  async getFloorPlans(@Param('propertyId') propertyId: string) {
    try {
      const floorPlans = await this.floorPlanService.getFloorPlansByPropertyId(propertyId);
      return floorPlans;
    } catch (error) {
      throw new HttpException(
        'Failed to fetch floor plans',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
