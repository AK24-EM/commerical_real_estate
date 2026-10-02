import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// @ts-ignore - Meilisearch types have resolution issues with current TypeScript config
import { Meilisearch } from 'meilisearch';
import { ConfigService } from '@nestjs/config';
import { PROPERTY_TYPE_CONFIGS } from '../properties/property-type-config';
import { Property } from '../properties/property.entity';

@Injectable()
export class SearchService implements OnModuleInit {
  private client: Meilisearch;
  private indexName = 'properties';
  private isMeilisearchAvailable = false;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
  ) {
    const host = this.configService.get<string>('MEILISEARCH_URL', 'http://localhost:7700');
    const apiKey = this.configService.get<string>('MEILISEARCH_API_KEY', 'magicbricksMasterKey123');
    
    this.client = new Meilisearch({
      host: host,
      apiKey: apiKey,
    });
  }

  async onModuleInit() {
    await this.initializeIndex();
  }

  private async initializeIndex() {
    try {
      // Check if Meilisearch is available
      await this.client.health();
      this.isMeilisearchAvailable = true;
      
      const index = this.client.index(this.indexName);

      // Base filterable attributes
      const baseFilterableAttributes = [
        'propertyType',
        'isGstReady',
        'isPowerBackup',
        'hasLoadingDock',
        'brokerId',
        'isBrokerVerified',
        'city',
        'carpetArea',
        'baseRent',
        'footfallScore',
      ];

      // Add type-specific attributes as filterable
      const typeSpecificAttributes = this.getTypeSpecificAttributes();
      
      await index.updateFilterableAttributes([
        ...baseFilterableAttributes,
        ...typeSpecificAttributes,
      ]);

      await index.updateSortableAttributes([
        'carpetArea',
        'baseRent',
        'footfallScore',
      ]);

      console.log('✅ Meilisearch index initialized with type-specific attributes');
    } catch (error) {
      this.isMeilisearchAvailable = false;
      console.warn('⚠️  Meilisearch not available - search will use database fallback');
      console.warn('   To enable full search features, start Meilisearch or configure MEILISEARCH_URL');
    }
  }

  private getTypeSpecificAttributes(): string[] {
    const attributes: string[] = [];
    PROPERTY_TYPE_CONFIGS.forEach(config => {
      config.attributes.forEach(attr => {
        if (attr.filterable && !attributes.includes(attr.key)) {
          attributes.push(attr.key);
        }
      });
    });
    return attributes;
  }

  async indexProperty(property: any) {
    if (!this.isMeilisearchAvailable) {
      console.warn('⚠️  Meilisearch not available - skipping index update');
      return;
    }
    
    const index = this.client.index(this.indexName);
    
    // Flatten type-specific attributes and broker featured status into the main document for search
    const flattenedProperty = {
      ...property,
      ...(property.typeSpecificAttributes || {}),
      // Include broker featured status for ranking boost
      isBrokerFeatured: property.broker?.isFeatured || false,
      brokerFeaturedUntil: property.broker?.featuredUntil || null,
    };
    
    await index.addDocuments([flattenedProperty]);
  }

  async indexProperties(properties: any[]) {
    if (!this.isMeilisearchAvailable) {
      console.warn('⚠️  Meilisearch not available - skipping index update');
      return;
    }
    
    const index = this.client.index(this.indexName);
    
    // Flatten type-specific attributes and broker featured status for all properties
    const flattenedProperties = properties.map(property => ({
      ...property,
      ...(property.typeSpecificAttributes || {}),
      // Include broker featured status for ranking boost
      isBrokerFeatured: property.broker?.isFeatured || false,
      brokerFeaturedUntil: property.broker?.featuredUntil || null,
    }));
    
    await index.addDocuments(flattenedProperties);
  }

  async searchProperties(query: string, filters: any) {
    if (!this.isMeilisearchAvailable) {
      console.warn('⚠️  Meilisearch not available - using database fallback search');
      return this.searchDatabase(query, filters);
    }
    
    try {
      const index = this.client.index(this.indexName);

      // Convert filter object to Meilisearch filter string.
      // Skip geo keys — those are used for post-search Haversine filtering, not Meilisearch clauses.
      const GEO_KEYS = new Set(['lat', 'lng', 'radius']);
      const filterParts: string[] = [];
      
      Object.entries(filters).forEach(([key, value]) => {
        if (GEO_KEYS.has(key)) return; // handled separately via filterByGeolocation()
        if (value === undefined || value === '' || value === null) return;
        
        if (typeof value === 'string') {
          filterParts.push(`${key} = '${value}'`);
        } else if (typeof value === 'boolean') {
          filterParts.push(`${key} = ${value}`);
        } else if (typeof value === 'number') {
          filterParts.push(`${key} = ${value}`);
        } else if (typeof value === 'object' && value !== null) {
          // Handle range filters: { min?, max? }
          const rangeValue = value as { min?: number; max?: number };
          if (rangeValue.min !== undefined) {
            filterParts.push(`${key} >= ${rangeValue.min}`);
          }
          if (rangeValue.max !== undefined) {
            filterParts.push(`${key} <= ${rangeValue.max}`);
          }
        }
      });

      const filterString = filterParts.join(' AND ');

      const results = await index.search(query, {
        filter: filterString || undefined,
        attributesToRetrieve: ['*'],
      });

      // Apply geographic filtering if coordinates are provided
      let hits = results.hits;
      if (filters.lat && filters.lng && filters.radius) {
        hits = this.filterByGeolocation(hits, filters.lat, filters.lng, filters.radius);
      }

      // FEATURED LISTING BOOST: Sort to show featured listings first
      hits = this.applyFeaturedBoost(hits);

      return hits;
    } catch (error) {
      console.error('❌ Meilisearch search error:', error instanceof Error ? error.message : String(error));
      // Fallback to database search if Meilisearch fails
      console.warn('⚠️  Falling back to database search');
      return this.searchDatabase(query, filters);
    }
  }

  private async searchDatabase(query: string, filters: any): Promise<any[]> {
    try {
      const properties = await this.propertyRepository.find();
      
      // Convert to DTO format
      const dtos = properties.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        propertyType: p.propertyType,
        carpetArea: p.carpetArea,
        superBuiltUpArea: p.superBuiltUpArea,
        baseRent: p.baseRent,
        escalationPercent: p.escalationPercent,
        escalationIntervalYears: p.escalationIntervalYears,
        lockInPeriodMonths: p.lockInPeriodMonths,
        securityDeposit: p.securityDeposit,
        maintenanceCharges: p.maintenanceCharges,
        gstNumber: p.gstNumber || null,
        isGstReady: p.isGstReady,
        isPowerBackup: p.isPowerBackup,
        hasLoadingDock: p.hasLoadingDock,
        footfallScore: p.footfallScore,
        nearbyBusinesses: p.nearbyBusinesses || [],
        brokerId: p.brokerId || null,
        brokerName: p.brokerName || null,
        brokerPhone: p.brokerPhone || null,
        isBrokerVerified: p.isBrokerVerified || false,
        hasFireNoc: p.hasFireNoc,
        hasOccupancyCertificate: p.hasOccupancyCertificate,
        hasParking: p.hasParking,
        floor: p.floor || null,
        totalFloors: p.totalFloors || null,
        furnishing: p.furnishing || null,
        facing: p.facing || null,
        cabins: p.cabins || null,
        meetingRooms: p.meetingRooms || null,
        workstations: p.workstations || null,
        landmark: p.landmark || null,
        reraNumber: p.reraNumber || null,
        city: p.city || null,
        typeSpecificAttributes: p.typeSpecificAttributes || {},
        latitude: p.latitude,
        longitude: p.longitude,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));

      // Apply text search filter
      let filtered = dtos;
      if (query && query.trim()) {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter(p => 
          p.title?.toLowerCase().includes(lowerQuery) ||
          p.city?.toLowerCase().includes(lowerQuery) ||
          p.landmark?.toLowerCase().includes(lowerQuery) ||
          p.description?.toLowerCase().includes(lowerQuery)
        );
      }

      // Apply property type filter
      if (filters.propertyType) {
        filtered = filtered.filter(p => p.propertyType === filters.propertyType);
      }

      // Apply city filter
      if (filters.city) {
        filtered = filtered.filter(p => p.city === filters.city);
      }

      // Apply boolean filters
      if (filters.isGstReady !== undefined) {
        filtered = filtered.filter(p => p.isGstReady === filters.isGstReady);
      }
      if (filters.isPowerBackup !== undefined) {
        filtered = filtered.filter(p => p.isPowerBackup === filters.isPowerBackup);
      }
      if (filters.hasLoadingDock !== undefined) {
        filtered = filtered.filter(p => p.hasLoadingDock === filters.hasLoadingDock);
      }

      // Apply range filters
      if (filters.baseRent) {
        const rentFilter = filters.baseRent as { min?: number; max?: number };
        if (rentFilter.min !== undefined) {
          filtered = filtered.filter(p => p.baseRent >= rentFilter.min!);
        }
        if (rentFilter.max !== undefined) {
          filtered = filtered.filter(p => p.baseRent <= rentFilter.max!);
        }
      }

      if (filters.carpetArea) {
        const areaFilter = filters.carpetArea as { min?: number; max?: number };
        if (areaFilter.min !== undefined) {
          filtered = filtered.filter(p => p.carpetArea >= areaFilter.min!);
        }
        if (areaFilter.max !== undefined) {
          filtered = filtered.filter(p => p.carpetArea <= areaFilter.max!);
        }
      }

      // Apply type-specific attribute filters against the typeSpecificAttributes JSONB blob.
      // These are the same keys injected into Meilisearch at index time via attribute flattening.
      const GEO_KEYS = new Set(['lat', 'lng', 'radius', 'propertyType', 'city', 'isGstReady',
        'isPowerBackup', 'hasLoadingDock', 'baseRent', 'carpetArea']);
      for (const [key, value] of Object.entries(filters)) {
        if (GEO_KEYS.has(key) || value === undefined || value === null || value === '') continue;
        filtered = filtered.filter(p => {
          // Check flattened top-level field first, then typeSpecificAttributes blob
          const propVal = (p as any)[key] ?? (p.typeSpecificAttributes as any)?.[key];
          if (propVal === undefined) return false;
          if (typeof value === 'boolean') return propVal === value;
          if (typeof value === 'string') return propVal === value;
          if (typeof value === 'object') {
            const range = value as { min?: number; max?: number };
            if (range.min !== undefined && propVal < range.min) return false;
            if (range.max !== undefined && propVal > range.max) return false;
            return true;
          }
          return true;
        });
      }

      // Apply geographic filtering
      if (filters.lat && filters.lng && filters.radius) {
        filtered = this.filterByGeolocation(filtered, filters.lat, filters.lng, filters.radius);
      }

      // FEATURED LISTING BOOST: Apply same boost as Meilisearch search
      filtered = this.applyFeaturedBoost(filtered);

      return filtered;
    } catch (error) {
      console.error('❌ Database search error:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  private filterByGeolocation(properties: any[], lat: number, lng: number, radiusMeters: number): any[] {
    return properties.filter(property => {
      if (!property.latitude || !property.longitude) return false;
      
      const distance = this.calculateDistance(
        lat,
        lng,
        property.latitude,
        property.longitude
      );
      
      return distance <= radiusMeters;
    });
  }

  /**
   * Apply featured listing boost to search results
   * 
   * Premium brokers with active featuredUntil timestamps get priority placement.
   * This gives paid subscribers better visibility while naturally decaying over time.
   * 
   * Sorting logic:
   * 1. Featured listings (featuredUntil > now) - sorted by recency
   * 2. Non-featured listings - sorted by relevance/footfall score
   */
  private applyFeaturedBoost(properties: any[]): any[] {
    const now = new Date();
    
    // Separate featured and non-featured properties
    const featured: any[] = [];
    const nonFeatured: any[] = [];
    
    properties.forEach(property => {
      // Check if property has broker relation loaded
      const broker = property.broker;
      const isFeatured = broker?.isFeatured || property.isBrokerFeatured;
      const featuredUntil = broker?.featuredUntil || property.brokerFeaturedUntil;
      
      // Property is featured if:
      // 1. Broker has isFeatured flag set to true
      // 2. featuredUntil timestamp exists and is in the future
      if (isFeatured && featuredUntil && new Date(featuredUntil) > now) {
        featured.push({
          ...property,
          _featuredScore: new Date(featuredUntil).getTime(), // For sorting
        });
      } else {
        nonFeatured.push(property);
      }
    });
    
    // Sort featured by expiry (newer featured status first)
    featured.sort((a, b) => b._featuredScore - a._featuredScore);
    
    // Sort non-featured by footfall score (or could use relevance)
    nonFeatured.sort((a, b) => (b.footfallScore || 0) - (a.footfallScore || 0));
    
    // Combine: featured listings first, then non-featured
    const boosted = [...featured, ...nonFeatured];
    
    if (featured.length > 0) {
      console.log(`🌟 Featured boost applied: ${featured.length} featured, ${nonFeatured.length} regular`);
    }
    
    return boosted;
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

  async removeProperty(id: string) {
    if (!this.isMeilisearchAvailable) {
      console.warn('⚠️  Meilisearch not available - skipping index removal');
      return;
    }
    
    const index = this.client.index(this.indexName);
    await index.deleteDocument(id);
  }

  async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (!this.isMeilisearchAvailable) {
      return [];
    }
    
    try {
      const index = this.client.index(this.indexName);
      
      const results = await index.search(query, {
        limit: limit,
        attributesToRetrieve: ['title', 'city', 'landmark'],
        attributesToHighlight: ['title', 'city', 'landmark'],
      });

      const suggestions = new Set<string>();
      
      results.hits.forEach((hit: any) => {
        if (hit.title) suggestions.add(hit.title);
        if (hit.city) suggestions.add(hit.city);
        if (hit.landmark) suggestions.add(hit.landmark);
      });

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      console.error('❌ Meilisearch suggestions error:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  async reindexAllProperties() {
    if (!this.isMeilisearchAvailable) {
      return { success: false, message: 'Meilisearch not available' };
    }
    
    try {
      const properties = await this.propertyRepository.find();
      console.log(`Found ${properties.length} properties in database`);
      
      // Convert to search index format
      const searchDocuments = properties.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        propertyType: p.propertyType,
        carpetArea: p.carpetArea,
        superBuiltUpArea: p.superBuiltUpArea,
        baseRent: p.baseRent,
        escalationPercent: p.escalationPercent,
        escalationIntervalYears: p.escalationIntervalYears,
        lockInPeriodMonths: p.lockInPeriodMonths,
        securityDeposit: p.securityDeposit,
        maintenanceCharges: p.maintenanceCharges,
        gstNumber: p.gstNumber || null,
        isGstReady: p.isGstReady,
        isPowerBackup: p.isPowerBackup,
        hasLoadingDock: p.hasLoadingDock,
        footfallScore: p.footfallScore,
        nearbyBusinesses: p.nearbyBusinesses || [],
        brokerId: p.brokerId || null,
        brokerName: p.brokerName || null,
        brokerPhone: p.brokerPhone || null,
        isBrokerVerified: p.isBrokerVerified || false,
        hasFireNoc: p.hasFireNoc,
        hasOccupancyCertificate: p.hasOccupancyCertificate,
        hasParking: p.hasParking,
        floor: p.floor || null,
        totalFloors: p.totalFloors || null,
        furnishing: p.furnishing || null,
        facing: p.facing || null,
        cabins: p.cabins || null,
        meetingRooms: p.meetingRooms || null,
        workstations: p.workstations || null,
        landmark: p.landmark || null,
        reraNumber: p.reraNumber || null,
        city: p.city || null,
        typeSpecificAttributes: p.typeSpecificAttributes || {},
        latitude: p.latitude,
        longitude: p.longitude,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        // Flatten type-specific attributes
        ...(p.typeSpecificAttributes || {}),
      }));

      console.log(`Prepared ${searchDocuments.length} documents for indexing`);

      const index = this.client.index(this.indexName);
      
      // Clear existing index
      console.log('Clearing existing index...');
      await index.deleteAllDocuments();
      
      // Add all properties
      console.log('Adding documents to Meilisearch...');
      const task = await index.addDocuments(searchDocuments);
      console.log(`Task enqueued: ${task.taskUid}`);
      
      console.log(`✅ Reindexed ${searchDocuments.length} properties to Meilisearch`);
      
      return { 
        success: true, 
        message: `Successfully reindexed ${searchDocuments.length} properties`,
        count: searchDocuments.length,
        taskId: task.taskUid
      };
    } catch (error) {
      console.error('❌ Reindex error:', error instanceof Error ? error.message : String(error));
      console.error('Error details:', error);
      return { 
        success: false, 
        message: `Reindex failed: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
}
