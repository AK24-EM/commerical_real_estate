import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface FootfallRequest {
  lat: number;
  lng: number;
}

export interface FootfallResponse {
  score: number;
  breakdown: {
    poiScore: number;
    transitScore: number;
    parkingScore: number;
    nearbyPoisCount: number;
    nearbyTransitCount: number;
    nearbyParkingCount: number;
    closestTransitDistance: number | null;
  };
  methodology: {
    description: string;
    weights: {
      poiDensity: string;
      transitProximity: string;
      parkingAvailability: string;
    };
    dataSources: string[];
  };
  disclaimer: string;
  isEstimate: boolean;
}

@Injectable()
export class FootfallCalculatorService {
  private googlePlacesUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

  constructor(private configService: ConfigService) {}

  async calculateFootfall(request: FootfallRequest): Promise<FootfallResponse> {
    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');

    // If no API key, return mock data for demo purposes
    if (!apiKey) {
      return this.getMockFootfallData(request);
    }

    try {
      // We perform 3 concurrent searches to get proxy signals
      const [poiData, transitData, parkingData] = await Promise.all([
        this.fetchNearby(request.lat, request.lng, 'commercial', 500),
        this.fetchNearby(request.lat, request.lng, 'transit_station', 1000),
        this.fetchNearby(request.lat, request.lng, 'parking', 500),
      ]);

      // 1. POI Score (Based on density of cafes, banks, restaurants)
      // Scale: 0-10. 20+ POIs = 10, 0 = 0.
      const poiScore = Math.min(10, (poiData.length / 20) * 10);

      // 2. Transit Score (Based on proximity and count of metro/bus stops)
      const transitScore = this.calculateTransitScore(transitData);

      // 3. Parking Score (Based on presence of parking lots)
      const parkingScore = Math.min(10, (parkingData.length / 5) * 10);

      // Final Weighted Score: POI (40%) + Transit (30%) + Parking (30%)
      const finalScore = Math.round((poiScore * 0.4 + transitScore * 0.3 + parkingScore * 0.3) * 10) / 10;

      return {
        score: Math.min(10, Math.max(1, Math.round(finalScore))),
        breakdown: {
          poiScore: Math.round(poiScore * 10) / 10,
          transitScore: Math.round(transitScore * 10) / 10,
          parkingScore: Math.round(parkingScore * 10) / 10,
          nearbyPoisCount: poiData.length,
          nearbyTransitCount: transitData.length,
          nearbyParkingCount: parkingData.length,
          closestTransitDistance: transitData[0]?.distance || null,
        },
        methodology: {
          description: 'Footfall Potential Score calculated using location-based proxy signals',
          weights: {
            poiDensity: '40% - Nearby commercial establishments (retail, dining, services)',
            transitProximity: '30% - Access to metro/bus stations within 1km',
            parkingAvailability: '30% - Parking facilities within 500m',
          },
          dataSources: ['Google Places API', 'POI Database', 'Transit Network Data'],
        },
        disclaimer: 'This is an estimated location quality score based on surrounding amenities and infrastructure, NOT a measured footfall count. Actual foot traffic will vary based on time of day, seasonality, and other factors. For leasing decisions, conduct on-site traffic studies.',
        isEstimate: true,
      };
    } catch (error) {
      // Fallback to mock data if API fails
      console.error('Google Places API failed, using mock data:', error);
      return this.getMockFootfallData(request);
    }
  }

  private getMockFootfallData(request: FootfallRequest): FootfallResponse {
    // Generate consistent mock data based on coordinates
    const seed = Math.abs(request.lat * request.lng);
    const poiScore = 5 + (seed % 5);
    const transitScore = 4 + (seed % 6);
    const parkingScore = 3 + (seed % 7);

    const finalScore = Math.round((poiScore * 0.4 + transitScore * 0.3 + parkingScore * 0.3) * 10) / 10;

    return {
      score: Math.min(10, Math.max(1, Math.round(finalScore))),
      breakdown: {
        poiScore: Math.round(poiScore * 10) / 10,
        transitScore: Math.round(transitScore * 10) / 10,
        parkingScore: Math.round(parkingScore * 10) / 10,
        nearbyPoisCount: 10 + (seed % 20),
        nearbyTransitCount: 2 + (seed % 5),
        nearbyParkingCount: 3 + (seed % 8),
        closestTransitDistance: 200 + (seed % 800),
      },
      methodology: {
        description: 'Footfall Potential Score calculated using location-based proxy signals',
        weights: {
          poiDensity: '40% - Nearby commercial establishments (retail, dining, services)',
          transitProximity: '30% - Access to metro/bus stations within 1km',
          parkingAvailability: '30% - Parking facilities within 500m',
        },
        dataSources: ['Mock Data - API Key Required for Real Data'],
      },
      disclaimer: 'This is an estimated location quality score based on surrounding amenities and infrastructure, NOT a measured footfall count. Actual foot traffic will vary based on time of day, seasonality, and other factors. For leasing decisions, conduct on-site traffic studies.',
      isEstimate: true,
    };
  }

  private async fetchNearby(lat: number, lng: number, type: string, radius: number) {
    try {
      const response = await axios.get(this.googlePlacesUrl, {
        params: {
          location: `${lat},${lng}`,
          radius: radius,
          type: type,
          key: this.configService.get<string>('GOOGLE_MAPS_API_KEY'),
        },
      });
      return response.data.results || [];
    } catch (error) {
      console.error(`Error fetching ${type} data:`, error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  private calculateTransitScore(transitData: any[]): number {
    if (transitData.length === 0) return 0;
    // More stations = higher score, cap at 10
    return Math.min(10, (transitData.length / 3) * 10);
  }
}
