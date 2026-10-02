import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PlanTier {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    unique: true,
  })
  tier!: PlanTier;

  @Column()
  name!: string; // "Free Plan", "Basic Plan", etc.

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Pricing
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number; // Monthly price in INR

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  quarterlyPrice?: number; // Quarterly price (optional discount)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  yearlyPrice?: number; // Yearly price (optional discount)

  @Column({
    type: 'varchar',
    default: BillingCycle.MONTHLY,
  })
  defaultBillingCycle!: BillingCycle;

  // Limits
  @Column()
  listingLimit!: number; // Maximum concurrent active listings

  @Column({ default: false })
  unlimitedListings!: boolean; // For enterprise/custom plans

  // Features
  @Column({ default: false })
  featuredListings!: boolean; // Featured boost in search results

  @Column({ default: 0 })
  featuredDurationDays!: number; // Days each listing stays featured (0 = entire subscription period)

  @Column({ default: false })
  prioritySupport!: boolean;

  @Column({ default: false })
  analyticsAccess!: boolean;

  @Column({ default: false })
  leadGeneration!: boolean;

  @Column({ default: false })
  socialMediaPromotion!: boolean;

  @Column({ default: false })
  dedicatedAccountManager!: boolean;

  // Razorpay Integration
  @Column({ nullable: true })
  razorpayPlanId?: string; // Razorpay plan ID for monthly billing

  @Column({ nullable: true })
  razorpayPlanIdQuarterly?: string; // Razorpay plan ID for quarterly

  @Column({ nullable: true })
  razorpayPlanIdYearly?: string; // Razorpay plan ID for yearly

  // Display
  @Column({ default: false })
  popular!: boolean; // Highlight as "Most Popular"

  @Column({ default: 0 })
  displayOrder!: number; // Order in UI (lower = first)

  @Column({ default: true })
  active!: boolean; // Is this plan available for new subscriptions?

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
