import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Broker, SubscriptionTier, BrokerStatus } from './broker.entity';

// Use crypto for password hashing if bcrypt is not available
import * as crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function comparePassword(password: string, hash: string): boolean {
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  return passwordHash === hash;
}

interface CreateBrokerDto {
  email: string;
  phone: string;
  password: string;
  businessName: string;
  contactPerson?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface UpdateBrokerDto {
  businessName?: string;
  contactPerson?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  bio?: string;
  website?: string;
  logoUrl?: string;
  phone?: string;
}

@Injectable()
export class BrokerService {
  constructor(
    @InjectRepository(Broker)
    private brokerRepository: Repository<Broker>,
  ) {}

  /**
   * Register a new broker
   */
  async registerBroker(dto: CreateBrokerDto): Promise<Broker> {
    // Check if email already exists
    const existingBroker = await this.brokerRepository.findOne({
      where: { email: dto.email },
    });

    if (existingBroker) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = hashPassword(dto.password);

    // Set listing limit based on tier (free tier initially)
    const listingLimit = this.getListingLimit(SubscriptionTier.FREE);

    // Create broker
    const broker = this.brokerRepository.create({
      email: dto.email,
      phone: dto.phone,
      password: hashedPassword,
      businessName: dto.businessName,
      contactPerson: dto.contactPerson,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      pincode: dto.pincode,
      subscriptionTier: SubscriptionTier.FREE,
      listingLimit,
      status: BrokerStatus.ACTIVE,
    });

    return await this.brokerRepository.save(broker);
  }

  /**
   * Get broker profile
   */
  async getBrokerProfile(brokerId: string): Promise<Broker> {
    const broker = await this.brokerRepository.findOne({
      where: { id: brokerId },
      relations: { properties: true },
    });

    if (!broker) {
      throw new NotFoundException('Broker not found');
    }

    return broker;
  }

  /**
   * Update broker profile
   */
  async updateBrokerProfile(brokerId: string, dto: UpdateBrokerDto): Promise<Broker> {
    const broker = await this.getBrokerProfile(brokerId);

    Object.assign(broker, dto);

    return await this.brokerRepository.save(broker);
  }

  /**
   * Get listing limit based on subscription tier
   */
  private getListingLimit(tier: SubscriptionTier): number {
    switch (tier) {
      case SubscriptionTier.FREE:
        return 3;
      case SubscriptionTier.BASIC:
        return 10; // ₹2,999/month
      case SubscriptionTier.PROFESSIONAL:
        return 50; // ₹5,999/month
      case SubscriptionTier.ENTERPRISE:
        return 200; // ₹9,999/month
      default:
        return 3;
    }
  }

  /**
   * Upgrade subscription
   */
  async upgradeSubscription(
    brokerId: string,
    tier: SubscriptionTier,
    durationMonths: number = 1,
  ): Promise<Broker> {
    const broker = await this.getBrokerProfile(brokerId);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);

    broker.subscriptionTier = tier;
    broker.subscriptionStartDate = startDate;
    broker.subscriptionEndDate = endDate;
    broker.listingLimit = this.getListingLimit(tier);

    return await this.brokerRepository.save(broker);
  }

  /**
   * Check if broker can add more listings
   */
  async canAddListing(brokerId: string): Promise<boolean> {
    const broker = await this.getBrokerProfile(brokerId);
    return broker.activeListingsCount < broker.listingLimit;
  }

  /**
   * Increment active listings count
   */
  async incrementListingCount(brokerId: string): Promise<void> {
    const broker = await this.getBrokerProfile(brokerId);
    
    if (broker.activeListingsCount >= broker.listingLimit) {
      throw new BadRequestException(
        `Listing limit reached. Current tier (${broker.subscriptionTier}) allows ${broker.listingLimit} listings. Please upgrade your subscription.`,
      );
    }

    broker.activeListingsCount += 1;
    await this.brokerRepository.save(broker);
  }

  /**
   * Decrement active listings count
   */
  async decrementListingCount(brokerId: string): Promise<void> {
    const broker = await this.getBrokerProfile(brokerId);
    
    if (broker.activeListingsCount > 0) {
      broker.activeListingsCount -= 1;
      await this.brokerRepository.save(broker);
    }
  }

  /**
   * Get all brokers (admin)
   */
  async getAllBrokers(verified?: boolean): Promise<Broker[]> {
    const where = verified !== undefined ? { verified } : {};
    return await this.brokerRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Suspend broker
   */
  async suspendBroker(brokerId: string, reason?: string): Promise<Broker> {
    const broker = await this.getBrokerProfile(brokerId);
    broker.status = BrokerStatus.SUSPENDED;
    return await this.brokerRepository.save(broker);
  }

  /**
   * Activate broker
   */
  async activateBroker(brokerId: string): Promise<Broker> {
    const broker = await this.getBrokerProfile(brokerId);
    broker.status = BrokerStatus.ACTIVE;
    return await this.brokerRepository.save(broker);
  }

  /**
   * Find broker by email (for authentication)
   */
  async findByEmail(email: string): Promise<Broker | null> {
    return await this.brokerRepository.findOne({
      where: { email },
    });
  }

  /**
   * Validate broker password
   */
  async validatePassword(broker: Broker, password: string): Promise<boolean> {
    return comparePassword(password, broker.password || '');
  }

  /**
   * Upgrade broker subscription tier
   * Updates tier and listing limit based on new plan
   */
  async upgradeTier(brokerId: string, newTier: SubscriptionTier | string): Promise<Broker> {
    const broker = await this.getBrokerProfile(brokerId);

    // Update tier
    broker.subscriptionTier = newTier as SubscriptionTier;

    // Update listing limit based on tier
    broker.listingLimit = this.getListingLimit(newTier as SubscriptionTier);

    return await this.brokerRepository.save(broker);
  }
}
