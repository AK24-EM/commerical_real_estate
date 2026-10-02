import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RazorpayService } from './razorpay.service';
import { SubscriptionPlan, PlanTier, BillingCycle } from './subscription-plan.entity';
import { Broker } from '../properties/broker.entity';
import { BrokerService } from '../properties/broker.service';

// DTOs
class InitiateSubscriptionDto {
  brokerId!: string;
  planTier?: PlanTier;
  tier?: PlanTier;
  billingCycle?: BillingCycle;
}

class UpgradeSubscriptionDto {
  newTier?: PlanTier;
  tier?: PlanTier;
  billingCycle?: BillingCycle;
}

/**
 * Subscription management endpoints
 * Handles plan selection, subscription creation, upgrades, and cancellations
 */
@Controller('subscriptions')
export class SubscriptionController {
  constructor(
    private readonly razorpayService: RazorpayService,
    private readonly brokerService: BrokerService,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(Broker)
    private readonly brokerRepository: Repository<Broker>,
  ) {}

  /**
   * Get all available subscription plans
   * GET /subscriptions/plans
   */
  @Get('plans')
  async getPlans(): Promise<{
    plans: SubscriptionPlan[];
    recommended: string;
  }> {
    const plans = await this.planRepository.find({
      where: { active: true },
      order: { displayOrder: 'ASC' },
    });

    // Find the popular plan (usually BASIC)
    const recommendedPlan = plans.find(p => p.popular);

    return {
      plans,
      recommended: recommendedPlan?.tier || PlanTier.BASIC,
    };
  }

  /**
   * Get a specific plan by tier
   * GET /subscriptions/plans/:tier
   */
  @Get('plans/:tier')
  async getPlanByTier(
    @Param('tier') tier: string,
  ): Promise<SubscriptionPlan> {
    const normalized = (tier || '').toLowerCase() as PlanTier;
    const plan = await this.planRepository.findOne({
      where: { tier: normalized },
    });

    if (!plan) {
      throw new BadRequestException('Plan not found');
    }

    return plan;
  }

  /**
   * Initiate a new subscription
   * POST /subscriptions/initiate
   * 
   * Creates Razorpay subscription (or fake subscription in demo mode) and returns response
   */
  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  async initiateSubscription(
    @Body() dto: InitiateSubscriptionDto,
  ): Promise<{
    success: boolean;
    subscriptionId: string;
    paymentUrl: string;
    shortUrl: string;
    tier: string;
    totalAmount: number;
    billingCycle: string;
    isFake: boolean;
    message: string;
  }> {
    if (!dto || !dto.brokerId) {
      throw new BadRequestException('brokerId is required');
    }

    // Support both 'tier' and 'planTier' from request
    const rawTier = dto.tier || dto.planTier;
    if (!rawTier) {
      throw new BadRequestException('tier is required');
    }
    const planTier = rawTier.toString().toLowerCase() as PlanTier;

    const rawCycle = dto.billingCycle;
    const billingCycle = (rawCycle ? rawCycle.toString().toLowerCase() : BillingCycle.MONTHLY) as BillingCycle;

    // Validate broker exists
    const broker = await this.brokerRepository.findOne({
      where: { id: dto.brokerId },
    });

    if (!broker) {
      throw new BadRequestException('Broker not found');
    }

    // Cannot downgrade to FREE via initiate
    if (planTier === PlanTier.FREE) {
      throw new BadRequestException('Cannot subscribe to FREE tier. Use cancel endpoint instead.');
    }

    // Check if broker already has an active subscription of the same tier
    const currentBrokerTier = (broker.subscriptionTier || PlanTier.FREE).toLowerCase() as PlanTier;
    if (currentBrokerTier === planTier && broker.paymentStatus === 'active') {
      throw new BadRequestException(
        'You already have an active subscription for this plan.',
      );
    }

    // If broker has an active subscription of a different tier, cancel old one first
    if (broker.razorpaySubscriptionId && broker.paymentStatus === 'active') {
      try {
        await this.razorpayService.cancelSubscription(dto.brokerId);
      } catch (err) {
        console.warn('Failed to cancel existing subscription before subscribing to new tier:', err);
      }
    }

    // Create subscription (returns real or fake subscription)
    const subscription = await this.razorpayService.createSubscription(
      dto.brokerId,
      planTier,
      billingCycle,
    );

    // Get plan details for response
    const plan = await this.planRepository.findOne({
      where: { tier: planTier },
    });

    let amount = plan?.price || 0;
    if (billingCycle === BillingCycle.QUARTERLY) {
      amount = plan?.quarterlyPrice || amount * 3;
    } else if (billingCycle === BillingCycle.YEARLY) {
      amount = plan?.yearlyPrice || amount * 12;
    }

    const isFake = !this.razorpayService.isConfigured() || (subscription as any).isFake;

    return {
      success: true,
      subscriptionId: subscription.subscriptionId,
      paymentUrl: subscription.shortUrl,
      shortUrl: subscription.shortUrl,
      tier: planTier,
      totalAmount: Math.round(Number(amount)),
      billingCycle: billingCycle,
      isFake: !!isFake,
      message: isFake
        ? `Fake subscription activated successfully for ${plan?.name || planTier}!`
        : `Subscription created for ${plan?.name || planTier}. Complete payment to activate.`,
    };
  }

  /**
   * Upgrade existing subscription
   * POST /subscriptions/:brokerId/upgrade
   * 
   * Upgrades broker to a higher tier
   */
  @Post(':brokerId/upgrade')
  @HttpCode(HttpStatus.OK)
  async upgradeSubscription(
    @Param('brokerId') brokerId: string,
    @Body() dto: UpgradeSubscriptionDto,
  ): Promise<{
    success: boolean;
    message: string;
    newTier: string;
    tier: string;
    newLimit: number;
    subscriptionId: string;
    shortUrl: string;
    paymentUrl: string;
    totalAmount: number;
    billingCycle: string;
    isFake: boolean;
  }> {
    const broker = await this.brokerRepository.findOne({
      where: { id: brokerId },
    });

    if (!broker) {
      throw new BadRequestException('Broker not found');
    }

    const rawTier = dto.newTier || dto.tier;
    if (!rawTier) {
      throw new BadRequestException('newTier is required');
    }
    const newTier = rawTier.toString().toLowerCase() as PlanTier;

    const currentTier = (broker.subscriptionTier || PlanTier.FREE).toLowerCase() as PlanTier;

    // Validate upgrade path
    const tierHierarchy = [PlanTier.FREE, PlanTier.BASIC, PlanTier.PROFESSIONAL, PlanTier.ENTERPRISE];
    const currentIndex = tierHierarchy.indexOf(currentTier);
    const newIndex = tierHierarchy.indexOf(newTier);

    if (newIndex <= currentIndex) {
      throw new BadRequestException(
        'You can only upgrade to a higher tier. To downgrade, please contact support.',
      );
    }

    // Cancel existing subscription if any
    if (broker.razorpaySubscriptionId) {
      try {
        await this.razorpayService.cancelSubscription(brokerId);
      } catch (error) {
        console.warn('Failed to cancel old subscription, continuing with upgrade...');
      }
    }

    const rawCycle = dto.billingCycle;
    const billingCycle = (rawCycle ? rawCycle.toString().toLowerCase() : BillingCycle.MONTHLY) as BillingCycle;

    // Create new subscription
    const subscription = await this.razorpayService.createSubscription(
      brokerId,
      newTier,
      billingCycle,
    );

    // Get new plan details
    const plan = await this.planRepository.findOne({ where: { tier: newTier } });

    // Update broker tier and listing limit
    await this.brokerService.upgradeTier(brokerId, newTier);

    let amount = plan?.price || 0;
    if (billingCycle === BillingCycle.QUARTERLY) {
      amount = plan?.quarterlyPrice || amount * 3;
    } else if (billingCycle === BillingCycle.YEARLY) {
      amount = plan?.yearlyPrice || amount * 12;
    }

    const isFake = !this.razorpayService.isConfigured() || (subscription as any).isFake;

    return {
      success: true,
      message: isFake
        ? `Successfully upgraded to ${plan?.name || newTier} (Demo Mode)!`
        : `Successfully upgraded to ${plan?.name || newTier}. Complete payment to activate.`,
      newTier: newTier,
      tier: newTier,
      newLimit: plan?.listingLimit || 0,
      subscriptionId: subscription.subscriptionId,
      shortUrl: subscription.shortUrl,
      paymentUrl: subscription.shortUrl,
      totalAmount: Math.round(Number(amount)),
      billingCycle: billingCycle,
      isFake: !!isFake,
    };
  }

  /**
   * Cancel subscription
   * POST /subscriptions/:brokerId/cancel
   */
  @Post(':brokerId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @Param('brokerId') brokerId: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.razorpayService.cancelSubscription(brokerId);

    // Downgrade to FREE tier
    await this.brokerService.upgradeTier(brokerId, PlanTier.FREE);

    return {
      success: true,
      message: 'Subscription cancelled successfully. You have been moved to the FREE plan (3 listings).',
    };
  }

  /**
   * Get subscription status for a broker
   * GET /subscriptions/:brokerId/status
   */
  @Get(':brokerId/status')
  async getSubscriptionStatus(
    @Param('brokerId') brokerId: string,
  ): Promise<{
    brokerId: string;
    currentTier: string;
    paymentStatus: string;
    razorpaySubscriptionId?: string;
    razorpayCustomerId?: string;
    subscriptionStartDate: Date | null;
    subscriptionEndDate: Date | null;
    nextBillingDate: Date | null;
    lastPaymentDate: Date | null;
    featuredUntil: Date | null;
    isFeatured: boolean;
    listingLimit: number;
    activeListingsCount: number;
    canUpgrade: boolean;
    upgradeOptions: PlanTier[];
    broker: {
      id: string;
      businessName: string;
      tier: string;
      paymentStatus: string;
      listingLimit: number;
      activeListingsCount: number;
      remainingListings: number;
      isFeatured: boolean;
      featuredUntil: Date | null;
      subscriptionStartDate: Date | null;
      subscriptionEndDate: Date | null;
      nextBillingDate: Date | null;
    };
    plan: SubscriptionPlan | null;
    suggestedUpgrade: string | null;
  }> {
    const broker = await this.brokerRepository.findOne({
      where: { id: brokerId },
    });

    if (!broker) {
      throw new BadRequestException('Broker not found');
    }

    const plan = await this.planRepository.findOne({
      where: { tier: broker.subscriptionTier as PlanTier },
    });

    // Determine if upgrade is needed/available
    const tierHierarchy = [PlanTier.FREE, PlanTier.BASIC, PlanTier.PROFESSIONAL, PlanTier.ENTERPRISE];
    const currentIndex = tierHierarchy.indexOf(broker.subscriptionTier as PlanTier);
    const canUpgrade = currentIndex < tierHierarchy.length - 1;
    const suggestedUpgrade = canUpgrade ? tierHierarchy[currentIndex + 1] : null;
    const upgradeOptions = canUpgrade ? tierHierarchy.slice(currentIndex + 1) : [];

    const brokerData = {
      id: broker.id,
      businessName: broker.businessName,
      tier: broker.subscriptionTier,
      paymentStatus: broker.paymentStatus,
      listingLimit: broker.listingLimit,
      activeListingsCount: broker.activeListingsCount,
      remainingListings: broker.listingLimit - broker.activeListingsCount,
      isFeatured: broker.isFeatured,
      featuredUntil: broker.featuredUntil || null,
      subscriptionStartDate: broker.subscriptionStartDate || null,
      subscriptionEndDate: broker.subscriptionEndDate || null,
      nextBillingDate: broker.nextBillingDate || null,
    };

    return {
      brokerId: broker.id,
      currentTier: broker.subscriptionTier,
      paymentStatus: broker.paymentStatus,
      razorpaySubscriptionId: broker.razorpaySubscriptionId,
      razorpayCustomerId: broker.razorpayCustomerId,
      subscriptionStartDate: broker.subscriptionStartDate || null,
      subscriptionEndDate: broker.subscriptionEndDate || null,
      nextBillingDate: broker.nextBillingDate || null,
      lastPaymentDate: broker.lastPaymentDate || null,
      featuredUntil: broker.featuredUntil || null,
      isFeatured: broker.isFeatured,
      listingLimit: broker.listingLimit,
      activeListingsCount: broker.activeListingsCount,
      canUpgrade,
      upgradeOptions,
      broker: brokerData,
      plan,
      suggestedUpgrade,
    };
  }

  /**
   * Calculate pricing for a tier and billing cycle
   * GET /subscriptions/pricing/:tier/:cycle
   */
  @Get('pricing/:tier/:cycle')
  async getPricing(
    @Param('tier') tier: string,
    @Param('cycle') cycle: string,
  ): Promise<{
    tier: string;
    billingCycle: string;
    price: number;
    currency: string;
    discount: number;
    features: string[];
  }> {
    const plan = await this.planRepository.findOne({
      where: { tier: tier as PlanTier },
    });

    if (!plan) {
      throw new BadRequestException('Plan not found');
    }

    let price: number;
    let discount = 0;

    switch (cycle) {
      case 'quarterly':
        price = plan.quarterlyPrice || plan.price * 3;
        discount = plan.price * 3 - (plan.quarterlyPrice || plan.price * 3);
        break;
      case 'yearly':
        price = plan.yearlyPrice || plan.price * 12;
        discount = plan.price * 12 - (plan.yearlyPrice || plan.price * 12);
        break;
      default:
        price = plan.price;
    }

    const features: string[] = [];
    features.push(`${plan.listingLimit} active listings`);
    if (plan.featuredListings) features.push('Featured listings boost');
    if (plan.prioritySupport) features.push('Priority support');
    if (plan.analyticsAccess) features.push('Advanced analytics');
    if (plan.leadGeneration) features.push('Lead generation tools');
    if (plan.socialMediaPromotion) features.push('Social media promotion');
    if (plan.dedicatedAccountManager) features.push('Dedicated account manager');

    return {
      tier: plan.tier,
      billingCycle: cycle,
      price,
      currency: 'INR',
      discount,
      features,
    };
  }
}
