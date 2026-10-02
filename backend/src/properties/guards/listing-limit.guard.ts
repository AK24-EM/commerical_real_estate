import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Broker } from '../broker.entity';

/**
 * Guard that enforces server-side listing limits based on broker subscription tier.
 * 
 * CRITICAL: This prevents brokers from bypassing client-side checks by calling the API directly.
 * 
 * Checks:
 * 1. Broker exists and is active
 * 2. Broker's activeListingsCount < listingLimit
 * 3. Rejects with 402 Payment Required if at capacity
 * 
 * Usage: Apply to property creation endpoints with @UseGuards(ListingLimitGuard)
 */
@Injectable()
export class ListingLimitGuard implements CanActivate {
  constructor(
    @InjectRepository(Broker)
    private brokerRepository: Repository<Broker>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    // Extract brokerId from request body or params
    const brokerId = body?.brokerId || request.params?.brokerId;

    if (!brokerId) {
      throw new BadRequestException('Broker ID is required to create a listing');
    }

    // Fetch broker with current listing count and tier info
    const broker = await this.brokerRepository.findOne({
      where: { id: brokerId },
    });

    if (!broker) {
      throw new NotFoundException(`Broker with ID ${brokerId} not found`);
    }

    // Check if broker account is active
    if (broker.status !== 'active') {
      throw new BadRequestException(
        `Broker account is ${broker.status}. Please contact support.`,
      );
    }

    // Check if broker has reached listing limit
    if (broker.activeListingsCount >= broker.listingLimit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: `You have reached your listing limit of ${broker.listingLimit} properties. ` +
            `Upgrade to a ${this.getUpgradeSuggestion(broker.subscriptionTier)} plan to list more properties.`,
          error: 'Payment Required',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // Store broker info in request for use in controller/service
    request.broker = broker;

    return true;
  }

  /**
   * Suggest the next tier upgrade based on current tier
   */
  private getUpgradeSuggestion(currentTier: string): string {
    const upgradePath: Record<string, string> = {
      free: 'Basic (10 listings for ₹2,999/month)',
      basic: 'Professional (50 listings for ₹5,999/month)',
      professional: 'Enterprise (200 listings for ₹9,999/month)',
      enterprise: 'Custom',
    };

    return upgradePath[currentTier.toLowerCase()] || 'higher';
  }
}
