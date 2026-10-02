import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { BrokerVerificationService } from './broker-verification.service';
import { BrokerService } from './broker.service';
import { PropertyService } from './property.service';
import { BrokerVerification, VerificationStatus } from './broker-verification.entity';
import { Broker } from './broker.entity';

// DTOs
class ReviewVerificationDto {
  status!: 'approved' | 'rejected' | 'resubmission_required';
  reviewedBy!: string; // Admin user ID or name
  reviewNotes?: string;
  rejectionReason?: string;
}

class SuspendBrokerDto {
  reason!: string;
}

/**
 * Admin endpoints for managing broker verifications
 * In production, these should be protected with admin authentication
 */
@Controller('admin')
export class AdminController {
  constructor(
    private readonly verificationService: BrokerVerificationService,
    private readonly brokerService: BrokerService,
    private readonly propertyService: PropertyService,
  ) {}

  /**
   * Get all pending verifications
   * GET /admin/verifications/pending
   */
  @Get('verifications/pending')
  async getPendingVerifications(): Promise<{
    count: number;
    verifications: BrokerVerification[];
  }> {
    const verifications = await this.verificationService.getPendingVerifications();
    
    return {
      count: verifications.length,
      verifications,
    };
  }

  /**
   * Get verification by ID
   * GET /admin/verifications/:id
   */
  @Get('verifications/:id')
  async getVerification(
    @Param('id') verificationId: string,
  ): Promise<BrokerVerification> {
    return await this.verificationService.getVerificationById(verificationId);
  }

  /**
   * Approve verification
   * POST /admin/verifications/:id/approve
   */
  @Post('verifications/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveVerification(
    @Param('id') verificationId: string,
    @Body() dto: { reviewedBy: string; reviewNotes?: string },
  ): Promise<{
    success: boolean;
    verification: BrokerVerification;
    message: string;
  }> {
    const verification = await this.verificationService.reviewVerification({
      verificationId,
      status: VerificationStatus.APPROVED,
      reviewedBy: dto.reviewedBy,
      reviewNotes: dto.reviewNotes,
    });

    return {
      success: true,
      verification,
      message: `Broker ${verification.broker.businessName} has been verified. Verified badge will now appear on all their listings.`,
    };
  }

  /**
   * Reject verification
   * POST /admin/verifications/:id/reject
   */
  @Post('verifications/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectVerification(
    @Param('id') verificationId: string,
    @Body() dto: { reviewedBy: string; rejectionReason: string; reviewNotes?: string },
  ): Promise<{
    success: boolean;
    verification: BrokerVerification;
    message: string;
  }> {
    if (!dto.rejectionReason) {
      throw new NotFoundException('Rejection reason is required');
    }

    const verification = await this.verificationService.reviewVerification({
      verificationId,
      status: VerificationStatus.REJECTED,
      reviewedBy: dto.reviewedBy,
      rejectionReason: dto.rejectionReason,
      reviewNotes: dto.reviewNotes,
    });

    return {
      success: true,
      verification,
      message: `Verification rejected. Broker will be notified to resubmit documents.`,
    };
  }

  /**
   * Request resubmission
   * POST /admin/verifications/:id/request-resubmission
   */
  @Post('verifications/:id/request-resubmission')
  @HttpCode(HttpStatus.OK)
  async requestResubmission(
    @Param('id') verificationId: string,
    @Body() dto: { reviewedBy: string; reviewNotes: string },
  ): Promise<{
    success: boolean;
    verification: BrokerVerification;
    message: string;
  }> {
    const verification = await this.verificationService.reviewVerification({
      verificationId,
      status: VerificationStatus.RESUBMISSION_REQUIRED,
      reviewedBy: dto.reviewedBy,
      reviewNotes: dto.reviewNotes,
    });

    return {
      success: true,
      verification,
      message: 'Resubmission requested. Broker will be notified.',
    };
  }

  /**
   * Get all brokers
   * GET /admin/brokers
   */
  @Get('brokers')
  async getAllBrokers(
    @Query('verified') verified?: string,
  ): Promise<{
    count: number;
    brokers: Partial<Broker>[];
  }> {
    const verifiedFilter = verified === 'true' ? true : verified === 'false' ? false : undefined;
    const brokers = await this.brokerService.getAllBrokers(verifiedFilter);

    // Remove passwords
    const brokersWithoutPasswords = brokers.map(({ password, ...broker }) => broker);

    return {
      count: brokersWithoutPasswords.length,
      brokers: brokersWithoutPasswords,
    };
  }

  /**
   * Get broker details with verification history
   * GET /admin/brokers/:id
   */
  @Get('brokers/:id')
  async getBrokerDetails(
    @Param('id') brokerId: string,
  ): Promise<{
    broker: Partial<Broker>;
    verificationHistory: BrokerVerification[];
  }> {
    const broker = await this.brokerService.getBrokerProfile(brokerId);
    const { password, ...brokerWithoutPassword } = broker;

    const verificationHistory = await this.verificationService.getBrokerVerificationHistory(brokerId);

    return {
      broker: brokerWithoutPassword,
      verificationHistory,
    };
  }

  /**
   * Suspend broker
   * POST /admin/brokers/:id/suspend
   */
  @Post('brokers/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendBroker(
    @Param('id') brokerId: string,
    @Body() dto: SuspendBrokerDto,
  ): Promise<{
    success: boolean;
    broker: Partial<Broker>;
    message: string;
  }> {
    const broker = await this.brokerService.suspendBroker(brokerId, dto.reason);
    const { password, ...brokerWithoutPassword } = broker;

    return {
      success: true,
      broker: brokerWithoutPassword,
      message: `Broker suspended. Reason: ${dto.reason}`,
    };
  }

  /**
   * Activate broker
   * POST /admin/brokers/:id/activate
   */
  @Post('brokers/:id/activate')
  @HttpCode(HttpStatus.OK)
  async activateBroker(
    @Param('id') brokerId: string,
  ): Promise<{
    success: boolean;
    broker: Partial<Broker>;
    message: string;
  }> {
    const broker = await this.brokerService.activateBroker(brokerId);
    const { password, ...brokerWithoutPassword } = broker;

    return {
      success: true,
      broker: brokerWithoutPassword,
      message: 'Broker activated successfully',
    };
  }

  /**
   * Get verification statistics
   * GET /admin/stats/verifications
   */
  @Get('stats/verifications')
  async getVerificationStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    resubmissionRequired: number;
  }> {
    // This would be implemented with proper database queries
    // For now, returning mock stats structure
    const pending = await this.verificationService.getPendingVerifications();
    
    return {
      total: 0, // Would query all verifications
      pending: pending.length,
      approved: 0, // Would query approved verifications
      rejected: 0, // Would query rejected verifications
      resubmissionRequired: 0, // Would query resubmission_required verifications
    };
  }

  /**
   * Get broker statistics
   * GET /admin/stats/brokers
   */
  @Get('stats/brokers')
  async getBrokerStats(): Promise<{
    total: number;
    verified: number;
    unverified: number;
    suspended: number;
    byTier: Record<string, number>;
  }> {
    const allBrokers = await this.brokerService.getAllBrokers();
    const verifiedBrokers = allBrokers.filter(b => b.verified);
    const suspendedBrokers = allBrokers.filter(b => b.status === 'suspended');

    const byTier: Record<string, number> = {};
    allBrokers.forEach(broker => {
      byTier[broker.subscriptionTier] = (byTier[broker.subscriptionTier] || 0) + 1;
    });

    return {
      total: allBrokers.length,
      verified: verifiedBrokers.length,
      unverified: allBrokers.length - verifiedBrokers.length,
      suspended: suspendedBrokers.length,
      byTier,
    };
  }

  /**
   * Sync active listings count for a broker (fix inconsistencies)
   * POST /admin/brokers/:id/sync-listing-count
   */
  @Post('brokers/:id/sync-listing-count')
  @HttpCode(HttpStatus.OK)
  async syncBrokerListingCount(
    @Param('id') brokerId: string,
  ): Promise<{
    success: boolean;
    brokerId: string;
    actualCount: number;
    message: string;
  }> {
    const actualCount = await this.propertyService.syncBrokerListingCount(brokerId);
    
    return {
      success: true,
      brokerId,
      actualCount,
      message: `Listing count synced. Broker now has ${actualCount} active listings.`,
    };
  }
}