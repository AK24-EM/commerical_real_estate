import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
// @ts-ignore - Razorpay doesn't have TypeScript definitions
import Razorpay from 'razorpay';
import { Broker, PaymentStatus } from '../properties/broker.entity';
import { SubscriptionPlan, PlanTier, BillingCycle } from './subscription-plan.entity';

interface RazorpaySubscriptionOptions {
  planId: string;
  customerId: string;
  totalCount: number; // Number of billing cycles (12 for yearly, etc.)
  quantity?: number;
  notifyInfo?: number;
  addons?: any[];
  notes?: Record<string, string>;
}

interface WebhookEvent {
  event: string;
  payload: {
    subscription?: {
      entity: {
        id: string;
        plan_id: string;
        customer_id: string;
        status: string;
        current_start: number;
        current_end: number;
        charge_at: number;
        start_at: number;
        end_at: number;
        paid_count: number;
        total_count: number;
      };
    };
    payment?: {
      entity: {
        id: string;
        amount: number;
        currency: string;
        status: string;
        order_id: string;
        invoice_id: string;
        subscription_id: string;
        created_at: number;
      };
    };
  };
}

/**
 * RazorpayService handles all Razorpay subscription and payment operations.
 * 
 * Key features:
 * - Create Razorpay customers for brokers
 * - Create and manage subscriptions
 * - Verify webhook signatures (CRITICAL for security)
 * - Handle subscription lifecycle events
 * - Calculate featured listing expiry based on tier
 */
@Injectable()
export class RazorpayService {
  private razorpay: any;
  private webhookSecret: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Broker)
    private brokerRepository: Repository<Broker>,
    @InjectRepository(SubscriptionPlan)
    private planRepository: Repository<SubscriptionPlan>,
  ) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    this.webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET', 'webhook_secret_123');

    if (!keyId || !keySecret) {
      console.warn('⚠️  Razorpay credentials not configured. Payment features will be disabled.');
      console.warn('   Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env file');
      return;
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    console.log('✅ Razorpay service initialized');
  }

  /**
   * Check if Razorpay is configured
   */
  isConfigured(): boolean {
    return !!this.razorpay;
  }

  /**
   * Create or retrieve Razorpay customer for a broker
   */
  async getOrCreateCustomer(broker: Broker): Promise<string> {
    // Return existing customer ID if available
    if (broker.razorpayCustomerId) {
      return broker.razorpayCustomerId;
    }

    if (!this.razorpay) {
      const brokerIdSafe = (broker.id || Date.now().toString()).replace(/-/g, '').substring(0, 8);
      const fakeCustomerId = `cust_fake_${brokerIdSafe}`;
      await this.brokerRepository.update(
        { id: broker.id },
        { razorpayCustomerId: fakeCustomerId },
      );
      return fakeCustomerId;
    }

    try {
      const customer = await this.razorpay.customers.create({
        name: broker.businessName,
        email: broker.email,
        contact: broker.phone,
        notes: {
          broker_id: broker.id,
          contact_person: broker.contactPerson || '',
        },
      });

      // Save customer ID to broker
      await this.brokerRepository.update(
        { id: broker.id },
        { razorpayCustomerId: customer.id },
      );

      console.log(`✅ Created Razorpay customer ${customer.id} for broker ${broker.businessName}`);
      return customer.id;
    } catch (error) {
      console.error('❌ Failed to create Razorpay customer:', error);
      throw new BadRequestException('Failed to create payment customer');
    }
  }

  /**
   * Create a subscription for a broker
   * 
   * @param brokerId - Broker ID
   * @param planTier - Subscription tier (BASIC, PROFESSIONAL, ENTERPRISE)
   * @param billingCycle - Monthly, Quarterly, or Yearly
   */
  async createSubscription(
    brokerId: string,
    planTier: PlanTier | string,
    billingCycle: BillingCycle | string = BillingCycle.MONTHLY,
  ): Promise<{
    subscriptionId: string;
    customerId: string;
    planId: string;
    shortUrl: string;
    isFake?: boolean;
  }> {
    if (!planTier) {
      throw new BadRequestException('Plan tier is required');
    }

    const normalizedTier = (planTier as string).toLowerCase() as PlanTier;
    const normalizedCycle = (billingCycle ? billingCycle.toString().toLowerCase() : BillingCycle.MONTHLY) as BillingCycle;

    // Get broker
    const broker = await this.brokerRepository.findOne({ where: { id: brokerId } });
    if (!broker) {
      throw new BadRequestException('Broker not found');
    }

    // Get plan
    const plan = await this.planRepository.findOne({ where: { tier: normalizedTier } });
    if (!plan) {
      throw new BadRequestException(`Subscription plan '${planTier}' not found`);
    }

    // If Razorpay is not configured, implement fake subscription directly
    if (!this.razorpay) {
      const fakeSubscriptionId = `sub_fake_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const customerId = await this.getOrCreateCustomer(broker);

      let durationMonths = 1;
      if (normalizedCycle === BillingCycle.QUARTERLY) {
        durationMonths = 3;
      } else if (normalizedCycle === BillingCycle.YEARLY) {
        durationMonths = 12;
      }

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + durationMonths);

      const featuredUntil = await this.calculateFeaturedExpiry(normalizedTier, startDate);

      // Directly activate the subscription in fake/demo mode
      await this.brokerRepository.update(
        { id: brokerId },
        {
          subscriptionTier: normalizedTier,
          listingLimit: plan.listingLimit || 10,
          paymentStatus: PaymentStatus.ACTIVE,
          subscriptionStartDate: startDate,
          subscriptionEndDate: endDate,
          lastPaymentDate: startDate,
          nextBillingDate: endDate,
          razorpaySubscriptionId: fakeSubscriptionId,
          razorpayCustomerId: customerId,
          isFeatured: !!featuredUntil,
          featuredUntil: featuredUntil ?? undefined,
        },
      );

      console.log(`✅ [Fake Subscription] Activated ${normalizedTier} plan (${normalizedCycle}) for broker ${broker.businessName}`);

      return {
        subscriptionId: fakeSubscriptionId,
        customerId,
        planId: plan.razorpayPlanId || `plan_fake_${normalizedTier}`,
        shortUrl: `https://fake-payment.local/sub/${fakeSubscriptionId}`,
        isFake: true,
      };
    }

    // Get or create Razorpay customer
    const customerId = await this.getOrCreateCustomer(broker);

    // Determine Razorpay plan ID based on billing cycle
    let razorpayPlanId: string;
    let totalCount: number;

    switch (billingCycle) {
      case BillingCycle.QUARTERLY:
        razorpayPlanId = plan.razorpayPlanIdQuarterly || plan.razorpayPlanId || '';
        totalCount = 4; // 1 year = 4 quarters
        break;
      case BillingCycle.YEARLY:
        razorpayPlanId = plan.razorpayPlanIdYearly || plan.razorpayPlanId || '';
        totalCount = 1; // 1 year
        break;
      default:
        razorpayPlanId = plan.razorpayPlanId || '';
        totalCount = 12; // 12 months
    }

    if (!razorpayPlanId) {
      throw new BadRequestException('Razorpay plan not configured for this tier');
    }

    try {
      const subscription = await this.razorpay.subscriptions.create({
        plan_id: razorpayPlanId,
        customer_id: customerId,
        total_count: totalCount,
        quantity: 1,
        start_at: Math.floor(Date.now() / 1000) + 60, // Start in 1 minute
        notify_info: 1, // Notify 1 billing cycle before end
        notes: {
          broker_id: brokerId,
          plan_tier: planTier,
          billing_cycle: billingCycle,
        },
      });

      // Update broker with subscription details
      await this.brokerRepository.update(
        { id: brokerId },
        {
          razorpaySubscriptionId: subscription.id,
          razorpayCustomerId: customerId,
          paymentStatus: PaymentStatus.PENDING,
        },
      );

      console.log(`✅ Created subscription ${subscription.id} for broker ${broker.businessName}`);

      return {
        subscriptionId: subscription.id,
        customerId,
        planId: razorpayPlanId,
        shortUrl: subscription.short_url,
      };
    } catch (error) {
      console.error('❌ Failed to create subscription:', error);
      throw new BadRequestException('Failed to create subscription');
    }
  }

  /**
   * Verify Razorpay webhook signature
   * CRITICAL: This prevents fake webhook attacks
   * 
   * @param payload - Raw webhook body
   * @param signature - X-Razorpay-Signature header value
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Handle subscription activated event
   * Called when payment is successful and subscription starts
   */
  async handleSubscriptionActivated(event: WebhookEvent): Promise<void> {
    const subscription = event.payload.subscription?.entity;
    if (!subscription) return;

    const brokerId = subscription.id; // Stored in notes during creation
    const broker = await this.brokerRepository.findOne({
      where: { razorpaySubscriptionId: subscription.id },
    });

    if (!broker) {
      console.error(`❌ Broker not found for subscription ${subscription.id}`);
      return;
    }

    // Calculate subscription dates
    const startDate = new Date(subscription.current_start * 1000);
    const endDate = new Date(subscription.current_end * 1000);

    // Calculate featured expiry based on tier
    const featuredUntil = await this.calculateFeaturedExpiry(broker.subscriptionTier, startDate);

    // Update broker
    await this.brokerRepository.update(
      { id: broker.id },
      {
        paymentStatus: PaymentStatus.ACTIVE,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        lastPaymentDate: new Date(),
        nextBillingDate: new Date(subscription.charge_at * 1000),
        ...(featuredUntil ? { featuredUntil } : {}),
        isFeatured: !!featuredUntil,
      },
    );

    console.log(`✅ Subscription activated for broker ${broker.businessName}`);
    console.log(`   Featured until: ${featuredUntil || 'N/A'}`);
  }

  /**
   * Handle subscription charged event (recurring payment)
   */
  async handleSubscriptionCharged(event: WebhookEvent): Promise<void> {
    const payment = event.payload.payment?.entity;
    if (!payment) return;

    const broker = await this.brokerRepository.findOne({
      where: { razorpaySubscriptionId: payment.subscription_id },
    });

    if (!broker) return;

    // Extend featured period for paid tiers
    const featuredUntil = await this.calculateFeaturedExpiry(broker.subscriptionTier, new Date());

    await this.brokerRepository.update(
      { id: broker.id },
      {
        paymentStatus: PaymentStatus.ACTIVE,
        lastPaymentDate: new Date(),
        ...(featuredUntil ? { featuredUntil } : {}),
        isFeatured: !!featuredUntil,
      },
    );

    console.log(`✅ Payment received for broker ${broker.businessName}`);
  }

  /**
   * Handle subscription paused or cancelled
   */
  async handleSubscriptionPaused(subscriptionId: string): Promise<void> {
    const broker = await this.brokerRepository.findOne({
      where: { razorpaySubscriptionId: subscriptionId },
    });

    if (!broker) return;

    await this.brokerRepository.update(
      { id: broker.id },
      {
        paymentStatus: PaymentStatus.PAST_DUE,
        isFeatured: false, // Remove featured status
      },
    );

    console.log(`⚠️  Subscription paused for broker ${broker.businessName}`);
  }

  /**
   * Handle subscription completed (all billing cycles done)
   */
  async handleSubscriptionCompleted(subscriptionId: string): Promise<void> {
    const broker = await this.brokerRepository.findOne({
      where: { razorpaySubscriptionId: subscriptionId },
    });

    if (!broker) return;

    await this.brokerRepository.update(
      { id: broker.id },
      {
        paymentStatus: PaymentStatus.EXPIRED,
        subscriptionEndDate: new Date(),
        isFeatured: false,
        featuredUntil: undefined,
      },
    );

    console.log(`⚠️  Subscription completed for broker ${broker.businessName}`);
  }

  /**
   * Calculate featured listing expiry based on tier
   * 
   * BASIC: 30 days from activation
   * PROFESSIONAL: 60 days from activation
   * ENTERPRISE: Featured throughout subscription (until subscription end)
   */
  private async calculateFeaturedExpiry(tier: string, fromDate: Date): Promise<Date | null> {
    const plan = await this.planRepository.findOne({ where: { tier: tier as PlanTier } });
    if (!plan || !plan.featuredListings) return null;

    if (plan.featuredDurationDays === 0) {
      // Featured for entire subscription period (ENTERPRISE)
      const endDate = new Date(fromDate);
      endDate.setMonth(endDate.getMonth() + 1); // At least 1 month
      return endDate;
    }

    // Calculate expiry date
    const expiryDate = new Date(fromDate);
    expiryDate.setDate(expiryDate.getDate() + plan.featuredDurationDays);
    return expiryDate;
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(brokerId: string): Promise<void> {
    const broker = await this.brokerRepository.findOne({ where: { id: brokerId } });
    if (!broker || !broker.razorpaySubscriptionId) {
      throw new BadRequestException('No active subscription found');
    }

    if (!this.razorpay || broker.razorpaySubscriptionId.startsWith('sub_fake')) {
      await this.brokerRepository.update(
        { id: brokerId },
        {
          paymentStatus: PaymentStatus.CANCELLED,
          isFeatured: false,
          featuredUntil: undefined,
        },
      );
      console.log(`✅ [Fake Subscription] Cancelled for broker ${broker.businessName}`);
      return;
    }

    try {
      await this.razorpay.subscriptions.cancel(broker.razorpaySubscriptionId);

      await this.brokerRepository.update(
        { id: brokerId },
        {
          paymentStatus: PaymentStatus.CANCELLED,
          isFeatured: false,
          featuredUntil: undefined,
        },
      );

      console.log(`✅ Subscription cancelled for broker ${broker.businessName}`);
    } catch (error) {
      console.error('❌ Failed to cancel subscription:', error);
      // Fallback: still mark as cancelled locally
      await this.brokerRepository.update(
        { id: brokerId },
        {
          paymentStatus: PaymentStatus.CANCELLED,
          isFeatured: false,
          featuredUntil: undefined,
        },
      );
    }
  }
}
