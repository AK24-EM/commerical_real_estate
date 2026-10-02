import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface NearbyBusiness {
  name: string;
  type: string;
  distance: number;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  isOpen: boolean;
  placeId?: string;
  photoUrl?: string;
}

export interface NearbyBusinessEcosystem {
  banks: NearbyBusiness[];
  restaurants: NearbyBusiness[];
  cafes: NearbyBusiness[];
  transitStations: NearbyBusiness[];
  parkingLots: NearbyBusiness[];
  hospitals: NearbyBusiness[];
  pharmacies: NearbyBusiness[];
  coworkingSpaces: NearbyBusiness[];
  gyms: NearbyBusiness[];
  totalCount: number;
  fetchedAt: Date;
  summary: string;
}

interface PlaceResult {
  name: string;
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now?: boolean;
  };
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id: string;
  photos?: Array<{ photo_reference: string }>;
}

@Injectable()
export class NearbyBusinessService {
  private googlePlacesUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
  private cache: Map<string, { data: NearbyBusinessEcosystem; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  constructor(private configService: ConfigService) {}

  async getNearbyBusinesses(lat: number, lng: number, radius: number = 1000): Promise<NearbyBusinessEcosystem> {
    const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}_${radius}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('🎯 Returning cached nearby businesses');
      return cached.data;
    }

    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');

    // If no API key, return mock data
    if (!apiKey) {
      console.log('⚠️ No Google Maps API key, using mock data');
      return this.getMockBusinesses(lat, lng, radius);
    }

    try {
      console.log(`🔍 Fetching nearby businesses for (${lat}, ${lng}) within ${radius}m`);

      // Fetch all categories in parallel
      const [
        banks,
        restaurants,
        cafes,
        transitStations,
        parkingLots,
        hospitals,
        pharmacies,
        coworkingSpaces,
        gyms,
      ] = await Promise.all([
        this.fetchPlaces(lat, lng, 'bank', radius, apiKey),
        this.fetchPlaces(lat, lng, 'restaurant', radius, apiKey),
        this.fetchPlaces(lat, lng, 'cafe', radius, apiKey),
        this.fetchPlaces(lat, lng, 'transit_station', radius, apiKey),
        this.fetchPlaces(lat, lng, 'parking', radius, apiKey),
        this.fetchPlaces(lat, lng, 'hospital', radius, apiKey),
        this.fetchPlaces(lat, lng, 'pharmacy', radius, apiKey),
        this.fetchPlaces(lat, lng, 'coworking_space', radius, apiKey),
        this.fetchPlaces(lat, lng, 'gym', radius, apiKey),
      ]);

      const totalCount = banks.length + restaurants.length + cafes.length +
                        transitStations.length + parkingLots.length +
                        hospitals.length + pharmacies.length +
                        coworkingSpaces.length + gyms.length;

      const ecosystem: NearbyBusinessEcosystem = {
        banks,
        restaurants,
        cafes,
        transitStations,
        parkingLots,
        hospitals,
        pharmacies,
        coworkingSpaces,
        gyms,
        totalCount,
        fetchedAt: new Date(),
        summary: this.generateSummary({
          banks: banks.length,
          restaurants: restaurants.length,
          cafes: cafes.length,
          transit: transitStations.length,
          parking: parkingLots.length,
          hospitals: hospitals.length,
          pharmacies: pharmacies.length,
          coworking: coworkingSpaces.length,
          gyms: gyms.length,
        }),
      };

      // Cache the result
      this.cache.set(cacheKey, { data: ecosystem, timestamp: Date.now() });

      console.log(`✅ Found ${totalCount} businesses nearby`);
      return ecosystem;
    } catch (error) {
      console.error('❌ Error fetching nearby businesses:', error);
      // Fallback to mock data
      return this.getMockBusinesses(lat, lng, radius);
    }
  }

  private async fetchPlaces(
    lat: number,
    lng: number,
    type: string,
    radius: number,
    apiKey: string,
  ): Promise<NearbyBusiness[]> {
    try {
      const response = await axios.get(this.googlePlacesUrl, {
        params: {
          location: `${lat},${lng}`,
          radius,
          type,
          key: apiKey,
        },
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        console.warn(`⚠️ Places API returned status: ${response.data.status} for type: ${type}`);
        return [];
      }

      const results: PlaceResult[] = response.data.results || [];

      return results.slice(0, 10).map((place) => {
        const distance = this.calculateDistance(
          lat,
          lng,
          place.geometry.location.lat,
          place.geometry.location.lng,
        );

        return {
          name: place.name,
          type: this.mapPlaceType(type),
          distance: Math.round(distance),
          address: place.vicinity,
          rating: place.rating,
          userRatingsTotal: place.user_ratings_total,
          isOpen: place.opening_hours?.open_now ?? false,
          placeId: place.place_id,
          photoUrl: place.photos?.[0]?.photo_reference
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${apiKey}`
            : undefined,
        };
      });
    } catch (error) {
      console.error(`Error fetching ${type}:`, error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private mapPlaceType(googleType: string): string {
    const typeMap: Record<string, string> = {
      bank: 'bank',
      restaurant: 'restaurant',
      cafe: 'cafe',
      transit_station: 'transit',
      parking: 'parking',
      hospital: 'hospital',
      pharmacy: 'pharmacy',
      coworking_space: 'coworking',
      gym: 'gym',
    };
    return typeMap[googleType] || googleType;
  }

  private generateSummary(counts: Record<string, number>): string {
    const parts: string[] = [];
    if (counts.banks > 0) parts.push(`${counts.banks} Bank${counts.banks > 1 ? 's' : ''}`);
    if (counts.restaurants > 0) parts.push(`${counts.restaurants} Restaurant${counts.restaurants > 1 ? 's' : ''}`);
    if (counts.cafes > 0) parts.push(`${counts.cafes} Café${counts.cafes > 1 ? 's' : ''}`);
    if (counts.transit > 0) parts.push(`${counts.transit} Transit Stop${counts.transit > 1 ? 's' : ''}`);
    if (counts.coworking > 0) parts.push(`${counts.coworking} Co-working Space${counts.coworking > 1 ? 's' : ''}`);
    if (counts.gyms > 0) parts.push(`${counts.gyms} Gym${counts.gyms > 1 ? 's' : ''}`);

    return parts.length > 0 ? parts.join(' • ') : 'Limited nearby amenities';
  }

  private getMockBusinesses(lat: number, lng: number, radius: number): NearbyBusinessEcosystem {
    // Generate consistent mock data based on location
    const seed = Math.abs(lat * lng);

    const banks = this.generateMockBusinesses('bank', 3 + (seed % 5), lat, lng);
    const restaurants = this.generateMockBusinesses('restaurant', 8 + (seed % 12), lat, lng);
    const cafes = this.generateMockBusinesses('cafe', 5 + (seed % 8), lat, lng);
    const transitStations = this.generateMockBusinesses('transit', 2 + (seed % 4), lat, lng);
    const parkingLots = this.generateMockBusinesses('parking', 4 + (seed % 6), lat, lng);
    const hospitals = this.generateMockBusinesses('hospital', 1 + (seed % 3), lat, lng);
    const pharmacies = this.generateMockBusinesses('pharmacy', 2 + (seed % 4), lat, lng);
    const coworkingSpaces = this.generateMockBusinesses('coworking', 1 + (seed % 3), lat, lng);
    const gyms = this.generateMockBusinesses('gym', 2 + (seed % 4), lat, lng);

    const totalCount = banks.length + restaurants.length + cafes.length +
                      transitStations.length + parkingLots.length +
                      hospitals.length + pharmacies.length +
                      coworkingSpaces.length + gyms.length;

    return {
      banks,
      restaurants,
      cafes,
      transitStations,
      parkingLots,
      hospitals,
      pharmacies,
      coworkingSpaces,
      gyms,
      totalCount,
      fetchedAt: new Date(),
      summary: this.generateSummary({
        banks: banks.length,
        restaurants: restaurants.length,
        cafes: cafes.length,
        transit: transitStations.length,
        parking: parkingLots.length,
        hospitals: hospitals.length,
        pharmacies: pharmacies.length,
        coworking: coworkingSpaces.length,
        gyms: gyms.length,
      }),
    };
  }

  private generateMockBusinesses(type: string, count: number, lat: number, lng: number): NearbyBusiness[] {
    const businessNames: Record<string, string[]> = {
      bank: ['ICICI Bank', 'HDFC Bank', 'SBI', 'Axis Bank', 'Kotak Bank', 'Yes Bank', 'IndusInd Bank'],
      restaurant: ['Paradise Biryani', 'Chutneys', 'Biryani Blues', 'Barbeque Nation', 'Punjabi Rasoi', 'South Indian Cafe', 'Chinese Wok'],
      cafe: ['Starbucks', 'Costa Coffee', 'Café Coffee Day', 'Blue Tokai', 'Third Wave Coffee', 'Barista'],
      transit: ['Metro Station - Line 1', 'Bus Stop - Route 45', 'Railway Station', 'Auto Stand'],
      parking: ['Multi-level Parking', 'Open Parking Lot', 'Valet Parking', 'Basement Parking'],
      hospital: ['Apollo Hospital', 'Fortis Healthcare', 'Max Hospital', 'AIIMS', 'City Hospital'],
      pharmacy: ['Apollo Pharmacy', 'MedPlus', 'PharmEasy Store', 'Local Medical'],
      coworking: ['WeWork', 'Awfis', '91springboard', 'IndiQube'],
      gym: ['Gold\'s Gym', 'Fitness First', 'Cult.fit', 'Anytime Fitness'],
    };

    const names = businessNames[type] || ['Business'];

    return Array.from({ length: count }, (_, i) => ({
      name: names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ''),
      type: type,
      distance: 50 + (i * 100) + (Math.random() * 200),
      address: `${Math.floor(Math.random() * 500)} Street, Area ${Math.floor(Math.random() * 10)}`,
      rating: 3.5 + Math.random() * 1.5,
      userRatingsTotal: 50 + Math.floor(Math.random() * 500),
      isOpen: Math.random() > 0.3,
    }));
  }
}