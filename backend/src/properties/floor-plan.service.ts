import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FloorPlan, FloorPlanMeasurement, FloorPlanRoom } from './floor-plan.entity';

@Injectable()
export class FloorPlanService {
  constructor(
    @InjectRepository(FloorPlan)
    private readonly floorPlanRepository: Repository<FloorPlan>,
  ) {}

  async getFloorPlanByPropertyId(propertyId: string): Promise<FloorPlan | null> {
    // Try to fetch from database
    const floorPlan = await this.floorPlanRepository.findOne({
      where: { propertyId },
    });

    // If no floor plan exists, return mock data for demo
    if (!floorPlan) {
      return this.createMockFloorPlan(propertyId);
    }

    return floorPlan;
  }

  async getFloorPlansByPropertyId(propertyId: string): Promise<FloorPlan[]> {
    const floorPlans = await this.floorPlanRepository.find({
      where: { propertyId },
      order: { floorLabel: 'ASC' },
    });

    // If no floor plans exist, return mock data
    if (floorPlans.length === 0) {
      return [this.createMockFloorPlan(propertyId)];
    }

    return floorPlans;
  }

  /**
   * Creates mock floor plan data for demo purposes
   */
  private createMockFloorPlan(propertyId: string): FloorPlan {
    const mockMeasurements: FloorPlanMeasurement[] = [
      {
        id: 'm1',
        label: 'Width',
        startPoint: { x: 100, y: 100 },
        endPoint: { x: 700, y: 100 },
        lengthFeet: 60,
        labelPosition: 'top',
        type: 'horizontal',
      },
      {
        id: 'm2',
        label: 'Length',
        startPoint: { x: 100, y: 100 },
        endPoint: { x: 100, y: 500 },
        lengthFeet: 40,
        labelPosition: 'left',
        type: 'vertical',
      },
      {
        id: 'm3',
        label: 'Reception Width',
        startPoint: { x: 100, y: 300 },
        endPoint: { x: 250, y: 300 },
        lengthFeet: 15,
        labelPosition: 'bottom',
        type: 'horizontal',
      },
      {
        id: 'm4',
        label: 'Conference Room Length',
        startPoint: { x: 550, y: 100 },
        endPoint: { x: 550, y: 250 },
        lengthFeet: 15,
        labelPosition: 'right',
        type: 'vertical',
      },
    ];

    const mockRooms: FloorPlanRoom[] = [
      {
        id: 'r1',
        name: 'Reception',
        type: 'reception',
        position: { x: 100, y: 200 },
        widthFeet: 15,
        heightFeet: 20,
        areaSqFt: 300,
        features: {
          doors: 2,
          windows: 1,
        },
      },
      {
        id: 'r2',
        name: 'Open Work Area',
        type: 'office',
        position: { x: 250, y: 100 },
        widthFeet: 40,
        heightFeet: 30,
        areaSqFt: 1200,
        features: {
          windows: 4,
          outlets: 20,
        },
      },
      {
        id: 'r3',
        name: 'Conference Room',
        type: 'meeting',
        position: { x: 550, y: 100 },
        widthFeet: 20,
        heightFeet: 15,
        areaSqFt: 300,
        features: {
          doors: 1,
          windows: 2,
        },
      },
      {
        id: 'r4',
        name: 'Manager Cabin 1',
        type: 'office',
        position: { x: 250, y: 400 },
        widthFeet: 15,
        heightFeet: 12,
        areaSqFt: 180,
        features: {
          doors: 1,
          windows: 1,
        },
      },
      {
        id: 'r5',
        name: 'Manager Cabin 2',
        type: 'office',
        position: { x: 400, y: 400 },
        widthFeet: 15,
        heightFeet: 12,
        areaSqFt: 180,
        features: {
          doors: 1,
          windows: 1,
        },
      },
      {
        id: 'r6',
        name: 'Pantry',
        type: 'cafeteria',
        position: { x: 550, y: 400 },
        widthFeet: 12,
        heightFeet: 10,
        areaSqFt: 120,
        features: {
          doors: 1,
        },
      },
      {
        id: 'r7',
        name: 'Restrooms',
        type: 'restroom',
        position: { x: 650, y: 400 },
        widthFeet: 12,
        heightFeet: 10,
        areaSqFt: 120,
        features: {
          doors: 2,
        },
      },
      {
        id: 'r8',
        name: 'Storage',
        type: 'storage',
        position: { x: 100, y: 450 },
        widthFeet: 10,
        heightFeet: 10,
        areaSqFt: 100,
        features: {
          doors: 1,
        },
      },
    ];

    const floorPlan = new FloorPlan();
    floorPlan.id = `fp_${propertyId}_mock`;
    floorPlan.propertyId = propertyId;
    floorPlan.imageUrl = 'https://via.placeholder.com/800x600/f0f0f0/333333?text=Floor+Plan';
    floorPlan.type = 'raster';
    floorPlan.scale = 10.0; // 10 pixels = 1 foot
    floorPlan.imageWidth = 800;
    floorPlan.imageHeight = 600;
    floorPlan.totalArea = 2500;
    floorPlan.floorLabel = '3rd Floor';
    floorPlan.measurements = mockMeasurements;
    floorPlan.rooms = mockRooms;
    floorPlan.createdAt = new Date();
    floorPlan.updatedAt = new Date();

    return floorPlan;
  }
}
