import { Injectable } from '@nestjs/common';
import { PropertyRepository } from '../properties/property.repository';

export enum SubscriptionTier {
  FREE = 'FREE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
}

export interface TierLimits {
  maxListings: number;
  hasVerifiedBadge: boolean;
  hasPremiumSupport: boolean;
}

@Injectable()
export class SubscriptionService {
  private readonly tierLimits: Record<SubscriptionTier, TierLimits> = {
    [SubscriptionTier.FREE]: {
      maxListings: 5,
      hasVerifiedBadge: false,
      hasPremiumSupport: false,
    },
    [SubscriptionTier.SILVER]: {
      maxListings: 20,
      hasVerifiedBadge: true,
      hasPremiumSupport: false,
    },
    [SubscriptionTier.GOLD]: {
      maxListings: 100,
      hasVerifiedBadge: true,
      hasPremiumSupport: true,
    },
  };

  constructor(
    private readonly propertyRepository: PropertyRepository,
  ) {}

  async getTierLimits(tier: SubscriptionTier): Promise<TierLimits> {
    return this.tierLimits[tier];
  }

  async canCreateListing(brokerId: string, tier: SubscriptionTier): Promise<{ allowed: boolean; reason?: string }> {
    const limits = this.tierLimits[tier];
    const properties = await this.propertyRepository.findAll();
    const currentListingCount = properties.filter(p => p.brokerId === brokerId).length;

    if (currentListingCount >= limits.maxListings) {
      return {
        allowed: false,
        reason: `You have reached the listing limit for the ${tier} tier (${limits.maxListings} listings). Please upgrade your plan.`,
      };
    }

    return { allowed: true };
  }
}
