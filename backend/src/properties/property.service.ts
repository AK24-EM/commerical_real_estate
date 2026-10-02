import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from './property.entity';
import { Broker } from './broker.entity';
import { PropertyRepository } from './property.repository';
import { SearchService } from '../search/search.service';

@Injectable()
export class PropertyService {
  constructor(
    private readonly propertyRepository: PropertyRepository,
    private readonly searchService: SearchService,
    @InjectRepository(Broker)
    private readonly brokerRepository: Repository<Broker>,
  ) {}

  async findAll(): Promise<any[]> {
    const properties = await this.propertyRepository.findAll();
    return properties.map(p => this.mapToDto(p));
  }

  async findOne(id: string): Promise<any | null> {
    const property = await this.propertyRepository.findOne(id);
    return property ? this.mapToDto(property) : null;
  }

  private mapToDto(property: Property) {
    // Generate realistic images based on property type
    const typeImages: Record<string, string[]> = {
      'Office': [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
        'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800',
        'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800',
      ],
      'Retail': [
        'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800',
        'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800',
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
      ],
      'Warehouse': [
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800',
        'https://images.unsplash.com/photo-1566427199351-921696309a1f?w=800',
        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800',
      ],
      'CoWorking': [
        'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800',
        'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800',
        'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?w=800',
      ],
      'Co-Working': [
        'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800',
        'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800',
        'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?w=800',
      ],
      'Showroom': [
        'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800',
        'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800',
      ],
      'Industrial': [
        'https://images.unsplash.com/photo-1565617927399-b0385d6b9e1e?w=800',
        'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800',
        'https://images.unsplash.com/photo-1504384308090-c54be3852f33?w=800',
      ],
    };

    const images = typeImages[property.propertyType] || typeImages['Office'];

    // Generate amenities based on property features
    const amenities: string[] = [];
    if (property.isPowerBackup) amenities.push('Power Backup');
    if (property.hasParking) amenities.push('Parking');
    if (property.isGstReady) amenities.push('GST Ready');
    if (property.hasFireNoc) amenities.push('Fire NOC');
    if (property.hasOccupancyCertificate) amenities.push('Occupancy Certificate');
    if (property.hasLoadingDock) amenities.push('Loading Dock');
    if (property.cabins > 0) amenities.push(`${property.cabins} Cabins`);
    if (property.meetingRooms > 0) amenities.push(`${property.meetingRooms} Meeting Rooms`);
    if (property.workstations > 0) amenities.push(`${property.workstations} Workstations`);

    return {
      id: property.id || 'unknown',
      title: property.title || 'Unnamed Property',
      description: property.description || '',
      propertyType: property.propertyType || 'Office',
      carpetArea: property.carpetArea ?? 0,
      superBuiltUpArea: property.superBuiltUpArea ?? 0,
      baseRent: property.baseRent ?? 0,
      escalationPercent: property.escalationPercent ?? 0,
      escalationIntervalYears: property.escalationIntervalYears ?? 0,
      lockInPeriodMonths: property.lockInPeriodMonths ?? 0,
      securityDeposit: property.securityDeposit ?? 0,
      maintenanceCharges: property.maintenanceCharges ?? 0,
      gstNumber: property.gstNumber || '',
      isGstReady: !!property.isGstReady,
      isPowerBackup: !!property.isPowerBackup,
      hasLoadingDock: !!property.hasLoadingDock,
      footfallScore: property.footfallScore ?? 0,
      nearbyBusinesses: property.nearbyBusinesses || [],
      brokerId: property.brokerId || 'unknown',
      brokerName: property.broker?.businessName || property.brokerName || 'Unknown Broker',
      brokerPhone: property.broker?.phone || property.brokerPhone || '',
      isBrokerVerified: property.broker?.verified || !!property.isBrokerVerified,
      hasFireNoc: !!property.hasFireNoc,
      hasOccupancyCertificate: !!property.hasOccupancyCertificate,
      hasParking: !!property.hasParking,
      floor: property.floor || null,
      totalFloors: property.totalFloors || null,
      furnishing: property.furnishing || null,
      facing: property.facing || null,
      cabins: property.cabins || null,
      meetingRooms: property.meetingRooms || null,
      workstations: property.workstations || null,
      landmark: property.landmark || null,
      reraNumber: property.reraNumber || null,
      city: property.city || 'Unknown City',
      typeSpecificAttributes: property.typeSpecificAttributes || {},
      createdAt: property.createdAt || new Date(),
      updatedAt: property.updatedAt || new Date(),

      location: property.landmark || 'Commercial Hub',
      latitude: property.latitude || 0,
      longitude: property.longitude || 0,
      priceUnit: '/Lakh/month',
      areaUnit: 'sq ft',
      images: images,
      floorPlanUrl: images[0], // Use first image as floor plan for demo
      amenities: amenities,
      listedDate: property.createdAt || new Date(),
      viewCount: 0,
      inquiryCount: 0,
      status: 'readyToMove',
      listingType: 'lease',
      isFeatured: property.footfallScore >= 9,
      isVerifiedBroker: property.broker?.verified || !!property.isBrokerVerified,
      // Broker details for display
      broker: property.broker ? {
        id: property.broker.id,
        businessName: property.broker.businessName,
        verified: property.broker.verified,
        phone: property.broker.phone,
        rating: property.broker.rating,
        totalDeals: property.broker.totalDeals,
        reraNumber: property.broker.reraNumber,
      } : null,
    };
  }

  async create(propertyData: Partial<Property>): Promise<Property> {
    const property = this.propertyRepository.create(propertyData);
    const savedProperty = await this.propertyRepository.save(property);
    
    // Increment broker's active listings count
    if (savedProperty.brokerId) {
      await this.incrementBrokerListingCount(savedProperty.brokerId);
    }
    
    // Sync with Meilisearch
    await this.searchService.indexProperty(savedProperty);
    
    return savedProperty;
  }

  async update(id: string, propertyData: Partial<Property>): Promise<Property | null> {
    const property = await this.propertyRepository.findOne(id);
    if (!property) return null;
    
    const updatedProperty = this.propertyRepository.merge(property, propertyData);
    const savedProperty = await this.propertyRepository.save(updatedProperty);
    
    // If brokerId changed, update counts for both old and new brokers
    if (propertyData.brokerId && property.brokerId !== propertyData.brokerId) {
      if (property.brokerId) {
        await this.decrementBrokerListingCount(property.brokerId);
      }
      await this.incrementBrokerListingCount(propertyData.brokerId);
    }
    
    // Sync with Meilisearch
    await this.searchService.indexProperty(savedProperty);
    
    return savedProperty;
  }

  async delete(id: string): Promise<boolean> {
    const property = await this.propertyRepository.findOne(id);
    if (!property) return false;
    
    const brokerId = property.brokerId;
    
    await this.propertyRepository.remove(property);
    
    // Decrement broker's active listings count
    if (brokerId) {
      await this.decrementBrokerListingCount(brokerId);
    }
    
    // Remove from Meilisearch
    await this.searchService.removeProperty(id);
    
    return true;
  }

  /**
   * Increment broker's active listing count
   * Called when a property is created
   */
  private async incrementBrokerListingCount(brokerId: string): Promise<void> {
    try {
      await this.brokerRepository.increment(
        { id: brokerId },
        'activeListingsCount',
        1,
      );
      console.log(`✅ Incremented listing count for broker ${brokerId}`);
    } catch (error) {
      console.error(`❌ Failed to increment listing count for broker ${brokerId}:`, error);
      // Don't throw - property is already created, this is just housekeeping
    }
  }

  /**
   * Decrement broker's active listing count
   * Called when a property is deleted or moved to another broker
   */
  private async decrementBrokerListingCount(brokerId: string): Promise<void> {
    try {
      const broker = await this.brokerRepository.findOne({ where: { id: brokerId } });
      if (broker && broker.activeListingsCount > 0) {
        await this.brokerRepository.decrement(
          { id: brokerId },
          'activeListingsCount',
          1,
        );
        console.log(`✅ Decremented listing count for broker ${brokerId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to decrement listing count for broker ${brokerId}:`, error);
      // Don't throw - property is already deleted, this is just housekeeping
    }
  }

  /**
   * Recalculate and sync active listings count for a broker
   * Useful for fixing inconsistencies
   */
  async syncBrokerListingCount(brokerId: string): Promise<number> {
    const properties = await this.propertyRepository.findByBrokerId(brokerId);
    
    const actualCount = properties.length;
    
    await this.brokerRepository.update(
      { id: brokerId },
      { activeListingsCount: actualCount },
    );
    
    console.log(`✅ Synced listing count for broker ${brokerId}: ${actualCount}`);
    return actualCount;
  }

  async findNearby(lat: number, lng: number, radiusMeters: number): Promise<Property[]> {
    // SQLite doesn't support PostGIS, so we'll do a simple distance calculation
    const properties = await this.propertyRepository.find();
    return properties.filter(property => {
      const distance = this.calculateDistance(
        lat,
        lng,
        property.latitude || 0,
        property.longitude || 0
      );
      return distance <= radiusMeters;
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
