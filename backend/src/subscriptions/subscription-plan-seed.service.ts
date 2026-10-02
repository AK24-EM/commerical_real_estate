import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SubscriptionPlan,
  PlanTier,
  BillingCycle,
} from './subscription-plan.entity';

@Injectable()
export class SubscriptionPlanSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private planRepository: Repository<SubscriptionPlan>,
  ) {}

  async onModuleInit() {
    await this.seedPlans();
  }

  private async seedPlans() {
    const existingPlans = await this.planRepository.count();
    if (existingPlans > 0) {
      console.log('✅ Subscription plans already seeded');
      return;
    }

    const plans: Partial<SubscriptionPlan>[] = [
      {
        tier: PlanTier.FREE,
        name: 'Free Plan',
        description:
          'Perfect for trying out the platform. List up to 3 properties and reach thousands of businesses.',
        price: 0,
        quarterlyPrice: 0,
        yearlyPrice: 0,
        defaultBillingCycle: BillingCycle.MONTHLY,
        listingLimit: 3,
        unlimitedListings: false,
        featuredListings: false,
        featuredDurationDays: 0,
        prioritySupport: false,
        analyticsAccess: false,
        leadGeneration: false,
        socialMediaPromotion: false,
        dedicatedAccountManager: false,
        popular: false,
        displayOrder: 1,
        active: true,
      },
      {
        tier: PlanTier.BASIC,
        name: 'Basic Plan',
        description:
          'Ideal for individual brokers. List 10 properties with featured boost and basic analytics.',
        price: 2999,
        quarterlyPrice: 7999, // ~11% discount (₹8,997 → ₹7,999)
        yearlyPrice: 29999, // ~17% discount (₹35,988 → ₹29,999)
        defaultBillingCycle: BillingCycle.MONTHLY,
        listingLimit: 10,
        unlimitedListings: false,
        featuredListings: true,
        featuredDurationDays: 30, // Listings stay featured for 30 days
        prioritySupport: false,
        analyticsAccess: true,
        leadGeneration: true,
        socialMediaPromotion: false,
        dedicatedAccountManager: false,
        popular: true, // Most popular plan
        displayOrder: 2,
        active: true,
      },
      {
        tier: PlanTier.PROFESSIONAL,
        name: 'Professional Plan',
        description:
          'For growing agencies. List 50 properties with priority support, advanced analytics, and social promotion.',
        price: 5999,
        quarterlyPrice: 15999, // ~11% discount (₹17,997 → ₹15,999)
        yearlyPrice: 59999, // ~17% discount (₹71,988 → ₹59,999)
        defaultBillingCycle: BillingCycle.MONTHLY,
        listingLimit: 50,
        unlimitedListings: false,
        featuredListings: true,
        featuredDurationDays: 60, // Listings stay featured for 60 days
        prioritySupport: true,
        analyticsAccess: true,
        leadGeneration: true,
        socialMediaPromotion: true,
        dedicatedAccountManager: false,
        popular: false,
        displayOrder: 3,
        active: true,
      },
      {
        tier: PlanTier.ENTERPRISE,
        name: 'Enterprise Plan',
        description:
          'For large real estate firms. List 200 properties with dedicated account manager and premium features.',
        price: 9999,
        quarterlyPrice: 26999, // ~10% discount (₹29,997 → ₹26,999)
        yearlyPrice: 99999, // ~17% discount (₹119,988 → ₹99,999)
        defaultBillingCycle: BillingCycle.MONTHLY,
        listingLimit: 200,
        unlimitedListings: false,
        featuredListings: true,
        featuredDurationDays: 0, // Featured throughout entire subscription period
        prioritySupport: true,
        analyticsAccess: true,
        leadGeneration: true,
        socialMediaPromotion: true,
        dedicatedAccountManager: true,
        popular: false,
        displayOrder: 4,
        active: true,
      },
    ];

    try {
      await this.planRepository.save(plans);
      console.log('✅ Subscription plans seeded successfully');
      console.log('   - FREE: 3 listings, ₹0/month');
      console.log('   - BASIC: 10 listings, ₹2,999/month (Featured 30 days)');
      console.log('   - PROFESSIONAL: 50 listings, ₹5,999/month (Featured 60 days)');
      console.log('   - ENTERPRISE: 200 listings, ₹9,999/month (Featured always)');
    } catch (error) {
      console.error('❌ Failed to seed subscription plans:', error);
    }
  }

  /**
   * Get listing limit for a tier
   */
  async getListingLimitForTier(tier: PlanTier): Promise<number> {
    const plan = await this.planRepository.findOne({ where: { tier } });
    return plan?.listingLimit || 3; // Default to FREE tier limit
  }

  /**
   * Get featured duration for a tier
   */
  async getFeaturedDurationForTier(tier: PlanTier): Promise<number> {
    const plan = await this.planRepository.findOne({ where: { tier } });
    return plan?.featuredDurationDays || 0;
  }

  /**
   * Check if tier includes featured listings
   */
  async hasFeaturedListings(tier: PlanTier): Promise<boolean> {
    const plan = await this.planRepository.findOne({ where: { tier } });
    return plan?.featuredListings || false;
  }
}
