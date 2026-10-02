import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { SubscriptionPlan, PlanTier } from './subscription-plan.entity';
import { Broker, PaymentStatus } from '../properties/broker.entity';
import { Property } from '../properties/property.entity';

@Controller('admin/subscriptions')
export class AdminSubscriptionController {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private subscriptionPlanRepo: Repository<SubscriptionPlan>,
    @InjectRepository(Broker)
    private brokerRepo: Repository<Broker>,
    @InjectRepository(Property)
    private propertyRepo: Repository<Property>,
  ) {}

  /**
   * Get subscription analytics overview
   */
  @Get('analytics/overview')
  async getAnalyticsOverview() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Total subscribers by tier
    const subscribersByTier = await this.brokerRepo
      .createQueryBuilder('broker')
      .select('broker.subscriptionTier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .groupBy('broker.subscriptionTier')
      .getRawMany();

    // Active subscriptions
    const activeSubscriptions = await this.brokerRepo.count({
      where: {
        paymentStatus: PaymentStatus.ACTIVE,
      },
    });

    // Monthly recurring revenue (MRR)
    const plans = await this.subscriptionPlanRepo.find();
    const planPricing = plans.reduce((acc, plan) => {
      acc[plan.tier] = plan.price;
      return acc;
    }, {} as Record<PlanTier, number>);

    const revenueByTier = await this.brokerRepo
      .createQueryBuilder('broker')
      .select('broker.subscriptionTier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .where('broker.paymentStatus = :status', { status: PaymentStatus.ACTIVE })
      .groupBy('broker.subscriptionTier')
      .getRawMany();

    let monthlyRevenue = 0;
    revenueByTier.forEach((item) => {
      const price = planPricing[item.tier as PlanTier] || 0;
      monthlyRevenue += price * parseInt(item.count);
    });

    // New subscriptions this month
    const newSubscriptionsThisMonth = await this.brokerRepo.count({
      where: {
        subscriptionStartDate: Between(firstDayOfMonth, lastDayOfMonth),
      },
    });

    // Churned subscriptions this month
    const churnedThisMonth = await this.brokerRepo.count({
      where: {
        subscriptionEndDate: Between(firstDayOfMonth, lastDayOfMonth),
        paymentStatus: PaymentStatus.CANCELLED,
      },
    });

    // Featured listings count
    const featuredListings = await this.brokerRepo.count({
      where: {
        isFeatured: true,
      },
    });

    // Past due subscriptions
    const pastDueCount = await this.brokerRepo.count({
      where: {
        paymentStatus: PaymentStatus.PAST_DUE,
      },
    });

    return {
      overview: {
        totalSubscribers: subscribersByTier.reduce(
          (sum, item) => sum + parseInt(item.count),
          0,
        ),
        activeSubscriptions,
        monthlyRecurringRevenue: monthlyRevenue,
        newSubscriptionsThisMonth,
        churnedThisMonth,
        churnRate:
          activeSubscriptions > 0
            ? (churnedThisMonth / activeSubscriptions) * 100
            : 0,
        featuredListings,
        pastDueCount,
      },
      subscribersByTier,
      revenueByTier: revenueByTier.map((item) => ({
        tier: item.tier,
        subscribers: parseInt(item.count),
        monthlyRevenue: planPricing[item.tier as PlanTier] * parseInt(item.count),
      })),
    };
  }

  /**
   * Get revenue analytics with historical data
   */
  @Get('analytics/revenue')
  async getRevenueAnalytics(@Query('months') months: string = '6') {
    const monthsCount = parseInt(months);
    const now = new Date();
    const monthlyData: Array<{
      month: string;
      activeSubscriptions: number;
      revenue: number;
    }> = [];

    for (let i = 0; i < monthsCount; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const activeInMonth = await this.brokerRepo.count({
        where: [
          {
            subscriptionStartDate: LessThan(monthEnd),
            paymentStatus: PaymentStatus.ACTIVE,
          },
          {
            subscriptionStartDate: Between(monthStart, monthEnd),
          },
        ],
      });

      // Calculate revenue for the month
      const plans = await this.subscriptionPlanRepo.find();
      const planPricing = plans.reduce((acc, plan) => {
        acc[plan.tier] = plan.price;
        return acc;
      }, {} as Record<PlanTier, number>);

      const tierCounts = await this.brokerRepo
        .createQueryBuilder('broker')
        .select('broker.subscriptionTier', 'tier')
        .addSelect('COUNT(*)', 'count')
        .where('broker.subscriptionStartDate <= :monthEnd', { monthEnd })
        .andWhere('broker.paymentStatus = :status', {
          status: PaymentStatus.ACTIVE,
        })
        .groupBy('broker.subscriptionTier')
        .getRawMany();

      let monthRevenue = 0;
      tierCounts.forEach((item) => {
        const price = planPricing[item.tier as PlanTier] || 0;
        monthRevenue += price * parseInt(item.count);
      });

      monthlyData.unshift({
        month: monthStart.toISOString().substring(0, 7), // YYYY-MM format
        activeSubscriptions: activeInMonth,
        revenue: monthRevenue,
      });
    }

    return {
      monthlyData,
      totalRevenue: monthlyData.reduce((sum, item) => sum + item.revenue, 0),
      averageMonthlyRevenue:
        monthlyData.reduce((sum, item) => sum + item.revenue, 0) /
        monthlyData.length,
    };
  }

  /**
   * Get subscription growth metrics
   */
  @Get('analytics/growth')
  async getGrowthMetrics() {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastMonthCount = await this.brokerRepo.count({
      where: {
        subscriptionStartDate: LessThan(thisMonth),
        paymentStatus: PaymentStatus.ACTIVE,
      },
    });

    const thisMonthCount = await this.brokerRepo.count({
      where: {
        paymentStatus: PaymentStatus.ACTIVE,
      },
    });

    const growthRate =
      lastMonthCount > 0
        ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100
        : 0;

    // Upgrade/downgrade tracking
    const upgradedThisMonth = await this.brokerRepo
      .createQueryBuilder('broker')
      .where('broker.updatedAt >= :thisMonth', { thisMonth })
      .andWhere('broker.subscriptionTier != :free', { free: PlanTier.FREE })
      .getCount();

    const downgradedThisMonth = await this.brokerRepo
      .createQueryBuilder('broker')
      .where('broker.updatedAt >= :thisMonth', { thisMonth })
      .andWhere('broker.subscriptionTier = :free', { free: PlanTier.FREE })
      .andWhere('broker.subscriptionEndDate IS NOT NULL')
      .getCount();

    return {
      lastMonthSubscribers: lastMonthCount,
      currentMonthSubscribers: thisMonthCount,
      growthRate: growthRate.toFixed(2),
      netNewSubscribers: thisMonthCount - lastMonthCount,
      upgradedThisMonth,
      downgradedThisMonth,
    };
  }

  /**
   * Get all active subscriptions with details
   */
  @Get('active')
  async getActiveSubscriptions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('tier') tier?: PlanTier,
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const queryBuilder = this.brokerRepo
      .createQueryBuilder('broker')
      .where('broker.paymentStatus = :status', { status: PaymentStatus.ACTIVE })
      .orderBy('broker.subscriptionStartDate', 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum);

    if (tier) {
      queryBuilder.andWhere('broker.subscriptionTier = :tier', { tier });
    }

    const [brokers, total] = await queryBuilder.getManyAndCount();

    const subscriptionsWithDetails = await Promise.all(
      brokers.map(async (broker) => {
        const listingCount = await this.propertyRepo.count({
          where: { brokerId: broker.id },
        });

        return {
          brokerId: broker.id,
          businessName: broker.businessName,
          email: broker.email,
          tier: broker.subscriptionTier,
          paymentStatus: broker.paymentStatus,
          subscriptionStartDate: broker.subscriptionStartDate,
          subscriptionEndDate: broker.subscriptionEndDate,
          nextBillingDate: broker.nextBillingDate,
          listingLimit: broker.listingLimit,
          activeListingsCount: broker.activeListingsCount,
          listingsUtilization:
            broker.listingLimit > 0
              ? (broker.activeListingsCount / broker.listingLimit) * 100
              : 0,
          isFeatured: broker.isFeatured,
          featuredUntil: broker.featuredUntil,
          razorpaySubscriptionId: broker.razorpaySubscriptionId,
        };
      }),
    );

    return {
      subscriptions: subscriptionsWithDetails,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get subscriptions expiring soon
   */
  @Get('expiring-soon')
  async getExpiringSoon(@Query('days') days: string = '7') {
    const daysNum = parseInt(days);
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysNum);

    const expiringBrokers = await this.brokerRepo.find({
      where: {
        subscriptionEndDate: Between(now, futureDate),
        paymentStatus: PaymentStatus.ACTIVE,
      },
      order: {
        subscriptionEndDate: 'ASC',
      },
    });

    return {
      count: expiringBrokers.length,
      brokers: expiringBrokers.map((broker) => ({
        brokerId: broker.id,
        businessName: broker.businessName,
        email: broker.email,
        tier: broker.subscriptionTier,
        subscriptionEndDate: broker.subscriptionEndDate,
        daysRemaining: Math.ceil(
          (broker.subscriptionEndDate!.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      })),
    };
  }

  /**
   * Get past due subscriptions
   */
  @Get('past-due')
  async getPastDueSubscriptions() {
    const pastDueBrokers = await this.brokerRepo.find({
      where: {
        paymentStatus: PaymentStatus.PAST_DUE,
      },
      order: {
        lastPaymentDate: 'ASC',
      },
    });

    return {
      count: pastDueBrokers.length,
      brokers: pastDueBrokers.map((broker) => ({
        brokerId: broker.id,
        businessName: broker.businessName,
        email: broker.email,
        phone: broker.phone,
        tier: broker.subscriptionTier,
        lastPaymentDate: broker.lastPaymentDate,
        nextBillingDate: broker.nextBillingDate,
        razorpaySubscriptionId: broker.razorpaySubscriptionId,
      })),
    };
  }

  /**
   * Get subscription plan performance
   */
  @Get('plans/performance')
  async getPlanPerformance() {
    const plans = await this.subscriptionPlanRepo.find();

    const performance = await Promise.all(
      plans.map(async (plan) => {
        const subscriberCount = await this.brokerRepo.count({
          where: {
            subscriptionTier: plan.tier,
            paymentStatus: PaymentStatus.ACTIVE,
          },
        });

        const revenue = subscriberCount * plan.price;

        const avgListingsUsed = await this.brokerRepo
          .createQueryBuilder('broker')
          .select('AVG(broker.activeListingsCount)', 'avg')
          .where('broker.subscriptionTier = :tier', { tier: plan.tier })
          .andWhere('broker.paymentStatus = :status', {
            status: PaymentStatus.ACTIVE,
          })
          .getRawOne();

        return {
          tier: plan.tier,
          name: plan.name,
          monthlyPrice: plan.price,
          listingLimit: plan.listingLimit,
          subscribers: subscriberCount,
          monthlyRevenue: revenue,
          avgListingsUsed: parseFloat(avgListingsUsed?.avg || '0').toFixed(1),
          utilizationRate:
            plan.listingLimit > 0
              ? (
                  (parseFloat(avgListingsUsed?.avg || '0') / plan.listingLimit) *
                  100
                ).toFixed(1)
              : 'N/A',
        };
      }),
    );

    return {
      plans: performance,
      totalRevenue: performance.reduce((sum, p) => sum + p.monthlyRevenue, 0),
      totalSubscribers: performance.reduce((sum, p) => sum + p.subscribers, 0),
    };
  }

  /**
   * Manually activate a subscription (admin override)
   */
  @Post(':brokerId/activate')
  @HttpCode(HttpStatus.OK)
  async manuallyActivateSubscription(
    @Param('brokerId') brokerId: string,
    @Body() body: { tier: PlanTier; durationDays: number },
  ) {
    const broker = await this.brokerRepo.findOne({ where: { id: brokerId } });
    if (!broker) {
      throw new Error('Broker not found');
    }

    const plan = await this.subscriptionPlanRepo.findOne({
      where: { tier: body.tier },
    });
    if (!plan) {
      throw new Error('Plan not found');
    }

    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + body.durationDays);

    broker.subscriptionTier = body.tier;
    broker.subscriptionStartDate = now;
    broker.subscriptionEndDate = endDate;
    broker.paymentStatus = PaymentStatus.ACTIVE;
    broker.listingLimit = plan.listingLimit;

    // Set featured status if applicable
    if (plan.featuredListings) {
      const featuredEnd = new Date();
      featuredEnd.setDate(now.getDate() + plan.featuredDurationDays);
      broker.featuredUntil = featuredEnd;
      broker.isFeatured = true;
    }

    await this.brokerRepo.save(broker);

    return {
      success: true,
      message: 'Subscription activated manually',
      broker: {
        id: broker.id,
        tier: broker.subscriptionTier,
        subscriptionEndDate: broker.subscriptionEndDate,
        listingLimit: broker.listingLimit,
      },
    };
  }

  /**
   * Manually cancel a subscription
   */
  @Delete(':brokerId/cancel')
  @HttpCode(HttpStatus.OK)
  async manuallyCancelSubscription(@Param('brokerId') brokerId: string) {
    const broker = await this.brokerRepo.findOne({ where: { id: brokerId } });
    if (!broker) {
      throw new Error('Broker not found');
    }

    broker.subscriptionTier = PlanTier.FREE;
    broker.subscriptionEndDate = new Date();
    broker.paymentStatus = PaymentStatus.CANCELLED;
    broker.listingLimit = 3; // Free tier limit
    broker.isFeatured = false;
    broker.featuredUntil = undefined;

    await this.brokerRepo.save(broker);

    return {
      success: true,
      message: 'Subscription cancelled',
      broker: {
        id: broker.id,
        tier: broker.subscriptionTier,
      },
    };
  }

  /**
   * Get system health metrics
   */
  @Get('health')
  async getSystemHealth() {
    const totalBrokers = await this.brokerRepo.count();
    const totalProperties = await this.propertyRepo.count();
    const activeSubscriptions = await this.brokerRepo.count({
      where: { paymentStatus: PaymentStatus.ACTIVE },
    });
    const featuredListings = await this.brokerRepo.count({
      where: { isFeatured: true },
    });

    // Check for issues
    const pastDue = await this.brokerRepo.count({
      where: { paymentStatus: PaymentStatus.PAST_DUE },
    });

    const overLimit = await this.brokerRepo
      .createQueryBuilder('broker')
      .where('broker.activeListingsCount > broker.listingLimit')
      .getCount();

    return {
      system: {
        totalBrokers,
        totalProperties,
        activeSubscriptions,
        featuredListings,
      },
      health: {
        pastDueSubscriptions: pastDue,
        brokersOverLimit: overLimit,
        status: pastDue > 10 || overLimit > 0 ? 'warning' : 'healthy',
      },
    };
  }
}
