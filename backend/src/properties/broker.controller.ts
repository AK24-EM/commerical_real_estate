import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { BrokerService } from './broker.service';
import { BrokerVerificationService } from './broker-verification.service';
import { Broker } from './broker.entity';
import { BrokerVerification } from './broker-verification.entity';

// DTOs for request validation
class RegisterBrokerDto {
  email!: string;
  phone!: string;
  password!: string;
  businessName!: string;
  contactPerson?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

class UpdateBrokerProfileDto {
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

class SubmitVerificationDto {
  brokerId!: string;
  panNumber!: string;
  panCardUrl?: string;
  reraNumber?: string;
  reraCertificateUrl?: string;
  reraStates?: string[];
  gstNumber?: string;
  businessLicenseUrl?: string;
}

class UpgradeSubscriptionDto {
  tier!: string;
  durationMonths!: number;
}

@Controller('brokers')
export class BrokerController {
  constructor(
    private readonly brokerService: BrokerService,
    private readonly verificationService: BrokerVerificationService,
  ) {}

  /**
   * Register a new broker
   * POST /brokers/register
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterBrokerDto): Promise<{
    success: boolean;
    broker: Broker;
    message: string;
  }> {
    const broker = await this.brokerService.registerBroker(dto);

    // Remove password from response
    const { password, ...brokerWithoutPassword } = broker;

    return {
      success: true,
      broker: brokerWithoutPassword as Broker,
      message: 'Broker registered successfully. Please submit verification documents to get verified badge.',
    };
  }

  /**
   * Get broker profile
   * GET /brokers/:id/profile
   */
  @Get(':id/profile')
  async getProfile(@Param('id') brokerId: string): Promise<Partial<Broker>> {
    const broker = await this.brokerService.getBrokerProfile(brokerId);
    const { password, ...brokerWithoutPassword } = broker;
    return brokerWithoutPassword;
  }

  /**
   * Update broker profile
   * PUT /brokers/:id/profile
   */
  @Put(':id/profile')
  async updateProfile(
    @Param('id') brokerId: string,
    @Body() dto: UpdateBrokerProfileDto,
  ): Promise<{
    success: boolean;
    broker: Partial<Broker>;
    message: string;
  }> {
    const broker = await this.brokerService.updateBrokerProfile(brokerId, dto);
    const { password, ...brokerWithoutPassword } = broker;

    return {
      success: true,
      broker: brokerWithoutPassword,
      message: 'Profile updated successfully',
    };
  }

  /**
   * Submit verification documents
   * POST /brokers/:id/verify-documents
   */
  @Post(':id/verify-documents')
  @HttpCode(HttpStatus.CREATED)
  async submitVerification(
    @Param('id') brokerId: string,
    @Body() dto: Omit<SubmitVerificationDto, 'brokerId'>,
  ): Promise<{
    success: boolean;
    verification: BrokerVerification;
    message: string;
  }> {
    // Validate PAN format before submission
    const panValid = this.verificationService.validatePanFormat(dto.panNumber);
    if (!panValid) {
      throw new BadRequestException(
        'Invalid PAN format. Expected format: ABCDE1234F (5 letters, 4 digits, 1 letter)',
      );
    }

    const verification = await this.verificationService.submitVerification({
      brokerId,
      ...dto,
    });

    let message = 'Verification documents submitted successfully. ';
    
    if (verification.reraLookupResult) {
      const lookupResult = JSON.parse(verification.reraLookupResult);
      if (lookupResult.found) {
        message += 'RERA number validated automatically. ';
      }
    }

    message += 'Your submission is under review and will be processed within 24-48 hours.';

    return {
      success: true,
      verification,
      message,
    };
  }

  /**
   * Get verification status
   * GET /brokers/:id/verification-status
   */
  @Get(':id/verification-status')
  async getVerificationStatus(
    @Param('id') brokerId: string,
  ): Promise<{
    broker: Partial<Broker>;
    verification: BrokerVerification | null;
    canSubmit: boolean;
  }> {
    const broker = await this.brokerService.getBrokerProfile(brokerId);
    const { password, ...brokerWithoutPassword } = broker;

    const verification = await this.verificationService.getVerificationStatus(brokerId);

    return {
      broker: brokerWithoutPassword,
      verification,
      canSubmit: !verification || verification.status === 'rejected' || verification.status === 'resubmission_required',
    };
  }

  /**
   * Get verification history
   * GET /brokers/:id/verification-history
   */
  @Get(':id/verification-history')
  async getVerificationHistory(
    @Param('id') brokerId: string,
  ): Promise<BrokerVerification[]> {
    return await this.verificationService.getBrokerVerificationHistory(brokerId);
  }

  /**
   * Upgrade subscription
   * POST /brokers/:id/upgrade-subscription
   */
  @Post(':id/upgrade-subscription')
  async upgradeSubscription(
    @Param('id') brokerId: string,
    @Body() dto: UpgradeSubscriptionDto,
  ): Promise<{
    success: boolean;
    broker: Partial<Broker>;
    message: string;
  }> {
    const broker = await this.brokerService.upgradeSubscription(
      brokerId,
      dto.tier as any,
      dto.durationMonths,
    );
    const { password, ...brokerWithoutPassword } = broker;

    return {
      success: true,
      broker: brokerWithoutPassword,
      message: `Subscription upgraded to ${dto.tier} for ${dto.durationMonths} months`,
    };
  }

  /**
   * Check listing availability
   * GET /brokers/:id/can-add-listing
   */
  @Get(':id/can-add-listing')
  async canAddListing(
    @Param('id') brokerId: string,
  ): Promise<{
    canAdd: boolean;
    currentCount: number;
    limit: number;
    tier: string;
  }> {
    const broker = await this.brokerService.getBrokerProfile(brokerId);
    const canAdd = await this.brokerService.canAddListing(brokerId);

    return {
      canAdd,
      currentCount: broker.activeListingsCount,
      limit: broker.listingLimit,
      tier: broker.subscriptionTier,
    };
  }

  /**
   * Login (simplified - in production use proper JWT auth)
   * POST /brokers/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: { email: string; password: string },
  ): Promise<{
    success: boolean;
    broker: Partial<Broker>;
    token?: string;
  }> {
    const broker = await this.brokerService.findByEmail(dto.email);
    
    if (!broker) {
      throw new BadRequestException('Invalid email or password');
    }

    const isValid = await this.brokerService.validatePassword(broker, dto.password);
    
    if (!isValid) {
      throw new BadRequestException('Invalid email or password');
    }

    const { password, ...brokerWithoutPassword } = broker;

    return {
      success: true,
      broker: brokerWithoutPassword,
      // In production, generate JWT token here
      token: `mock-jwt-token-${broker.id}`,
    };
  }

  /**
   * Validate PAN format (helper endpoint)
   * POST /brokers/validate-pan
   */
  @Post('validate-pan')
  @HttpCode(HttpStatus.OK)
  async validatePan(
    @Body() dto: { panNumber: string },
  ): Promise<{
    valid: boolean;
    message: string;
  }> {
    const valid = this.verificationService.validatePanFormat(dto.panNumber);
    
    return {
      valid,
      message: valid
        ? 'PAN format is valid'
        : 'Invalid PAN format. Expected: ABCDE1234F (5 letters, 4 digits, 1 letter)',
    };
  }

  /**
   * Validate RERA format (helper endpoint)
   * POST /brokers/validate-rera
   */
  @Post('validate-rera')
  @HttpCode(HttpStatus.OK)
  async validateRera(
    @Body() dto: { reraNumber: string; state?: string },
  ): Promise<{
    valid: boolean;
    message: string;
  }> {
    const valid = this.verificationService.validateReraFormat(dto.reraNumber, dto.state);
    
    return {
      valid,
      message: valid
        ? 'RERA format is valid'
        : 'Invalid RERA format for the specified state',
    };
  }
}
