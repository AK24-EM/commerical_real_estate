import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Property } from './property.entity';
import { BrokerVerification } from './broker-verification.entity';
import { PlanTier as SubscriptionTier } from '../subscriptions/subscription-plan.entity';

export { SubscriptionTier };

export enum BrokerStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

export enum PaymentStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('brokers')
export class Broker {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  phone!: string;

  @Column({ nullable: true })
  password?: string; // Hashed password

  @Column()
  businessName!: string;

  @Column({ nullable: true })
  contactPerson?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true })
  pincode?: string;

  // Verification fields
  @Column({ default: false })
  verified!: boolean;

  @Column({ nullable: true })
  panNumber?: string; // PAN card number

  @Column({ nullable: true })
  reraNumber?: string; // RERA registration number

  @Column({ type: 'simple-array', nullable: true })
  reraStates?: string[]; // States where RERA is registered

  // Subscription
  @Column({
    type: 'varchar',
    default: SubscriptionTier.FREE,
  })
  subscriptionTier!: SubscriptionTier;

  @Column({ nullable: true })
  subscriptionStartDate?: Date;

  @Column({ nullable: true })
  subscriptionEndDate?: Date;

  @Column({ default: 0 })
  listingLimit!: number; // Based on subscription tier

  @Column({ default: 0 })
  activeListingsCount!: number;

  // Payment tracking (Razorpay integration)
  @Column({ nullable: true })
  razorpaySubscriptionId?: string; // Razorpay subscription ID

  @Column({ nullable: true })
  razorpayCustomerId?: string; // Razorpay customer ID

  @Column({
    type: 'varchar',
    default: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus;

  @Column({ nullable: true })
  lastPaymentDate?: Date;

  @Column({ nullable: true })
  nextBillingDate?: Date;

  // Featured listing boost (Premium feature)
  @Column({ nullable: true })
  featuredUntil?: Date; // Timestamp until listings are featured in search

  @Column({ default: false })
  isFeatured!: boolean; // Cached flag for quick checks

  // Status
  @Column({
    type: 'varchar',
    default: BrokerStatus.ACTIVE,
  })
  status!: BrokerStatus;

  // Profile
  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  logoUrl?: string;

  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  rating?: number;

  @Column({ default: 0 })
  totalReviews!: number;

  @Column({ default: 0 })
  totalDeals!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => Property, (property) => property.broker)
  properties!: Property[];

  @OneToMany(() => BrokerVerification, (verification) => verification.broker)
  verifications!: BrokerVerification[];
}
