import { Controller, Get, Query, Logger } from '@nestjs/common';
import { SearchService } from './search.service';
import { PROPERTY_TYPE_CONFIGS, getPropertyTypeConfig } from '../properties/property-type-config';

// Keys used for geographic filtering — never passed to Meilisearch as filter clauses
const GEO_KEYS = new Set(['lat', 'lng', 'radius']);

@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query('q') query: string = '',
    @Query('type') type?: string,
    @Query('gst') gst?: string,
    @Query('power') power?: string,
    @Query('dock') dock?: string,
    @Query('city') city?: string,
    @Query('verified') verified?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minArea') minArea?: string,
    @Query('maxArea') maxArea?: string,
    @Query('typeSpecificFilters') typeSpecificFilters?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
  ) {
    const filters: any = {};
    if (type) filters.propertyType = type;
    if (gst !== undefined) filters.isGstReady = gst === 'true';
    if (power !== undefined) filters.isPowerBackup = power === 'true';
    if (dock !== undefined) filters.hasLoadingDock = dock === 'true';
    if (verified !== undefined) filters.isBrokerVerified = verified === 'true';
    if (city) filters.city = city;
    if (minPrice) filters.baseRent = { min: parseFloat(minPrice) * 100000 }; // Convert Lakh to actual
    if (maxPrice) filters.baseRent = { ...filters.baseRent, max: parseFloat(maxPrice) * 100000 };
    if (minArea) filters.carpetArea = { min: parseFloat(minArea) };
    if (maxArea) filters.carpetArea = { ...filters.carpetArea, max: parseFloat(maxArea) };

    // Geographic filtering — stored separately, applied post-search via Haversine
    if (lat && lng && radius) {
      filters.lat = parseFloat(lat);
      filters.lng = parseFloat(lng);
      filters.radius = parseFloat(radius);
    }

    // Parse type-specific filters from JSON string.
    // Expected shape: { dockHeight: { min: 8, max: 40 }, hasColdStorage: true, storefrontType: 'Mall' }
    // Both 'range' and 'number' attribute types send { min, max } objects.
    if (typeSpecificFilters) {
      try {
        const parsed = JSON.parse(typeSpecificFilters);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          for (const [key, value] of Object.entries(parsed)) {
            // Skip any geo keys that shouldn't leak into Meilisearch filters
            if (GEO_KEYS.has(key)) continue;
            filters[key] = value;
          }
          this.logger.debug(`Type-specific filters applied: ${Object.keys(parsed).join(', ')}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to parse typeSpecificFilters: ${typeSpecificFilters}`);
      }
    }

    return this.searchService.searchProperties(query, filters);
  }

  @Get('filter-config')
  getFilterConfig(@Query('type') type?: string) {
    if (type) {
      const config = getPropertyTypeConfig(type);
      if (!config) {
        return { error: 'Property type not found' };
      }
      return config;
    }
    return PROPERTY_TYPE_CONFIGS;
  }

  @Get('suggest')
  async getSuggestions(
    @Query('q') query: string = '',
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.searchService.getSuggestions(query, limitNum);
  }

  @Get('reindex')
  async reindex() {
    return this.searchService.reindexAllProperties();
  }
}
