import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrokerVerification, VerificationStatus } from './broker-verification.entity';
import { Broker } from './broker.entity';

interface SubmitVerificationDto {
  brokerId: string;
  panNumber: string;
  panCardUrl?: string;
  reraNumber?: string;
  reraCertificateUrl?: string;
  reraStates?: string[];
  gstNumber?: string;
  businessLicenseUrl?: string;
}

interface ReviewVerificationDto {
  verificationId: string;
  status: VerificationStatus.APPROVED | VerificationStatus.REJECTED | VerificationStatus.RESUBMISSION_REQUIRED;
  reviewedBy: string;
  reviewNotes?: string;
  rejectionReason?: string;
}

interface ReraLookupResult {
  found: boolean;
  registrationNumber?: string;
  name?: string;
  state?: string;
  validUntil?: Date;
  status?: string;
}

@Injectable()
export class BrokerVerificationService {
  constructor(
    @InjectRepository(BrokerVerification)
    private verificationRepository: Repository<BrokerVerification>,
    @InjectRepository(Broker)
    private brokerRepository: Repository<Broker>,
  ) {}

  /**
   * Validate PAN card format
   * Format: ABCDE1234F (5 letters, 4 digits, 1 letter)
   */
  validatePanFormat(panNumber: string): boolean {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    return panRegex.test(panNumber.toUpperCase());
  }

  /**
   * Validate RERA number format (varies by state)
   * Common patterns across states
   */
  validateReraFormat(reraNumber: string, state?: string): boolean {
    if (!reraNumber) return true; // RERA is optional

    // Remove spaces and convert to uppercase
    const cleaned = reraNumber.replace(/\s+/g, '').toUpperCase();

    // Common RERA patterns:
    // Maharashtra: P51900012345 or A51900012345
    // Karnataka: PRM/KA/RERA/1251/309/PR/123456/000001
    // Delhi: DLRERA2018A0012
    // Gujarat: PR/GJ/AHMEDABAD/AHMEDABAD CITY/AHMEDABAD/RAA12345/123456
    
    const patterns = [
      /^[PA]\d{11}$/, // Maharashtra
      /^PRM\/\w{2}\/RERA\/\d+\/\d+\/PR\/\d+\/\d+$/i, // Karnataka
      /^DLRERA\d{4}[A-Z]\d{4}$/, // Delhi
      /^PR\/\w{2}\/[\w\s]+\/[\w\s]+\/[\w\s]+\/[A-Z]{3}\d+\/\d+$/i, // Gujarat
      /^[A-Z0-9\/\-]{10,50}$/, // Generic pattern
    ];

    return patterns.some(pattern => pattern.test(cleaned));
  }

  /**
   * Simulate RERA lookup (in production, this would call state RERA APIs)
   * For now, returns mock validation based on format
   */
  async simulateReraLookup(reraNumber: string, state: string): Promise<ReraLookupResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // In production, this would:
    // 1. Call the state's RERA API/portal
    // 2. Scrape the RERA website if no API exists
    // 3. Fall back to manual review if neither works

    if (!reraNumber) {
      return { found: false };
    }

    const isValidFormat = this.validateReraFormat(reraNumber, state);
    
    if (isValidFormat) {
      // Simulate successful lookup
      return {
        found: true,
        registrationNumber: reraNumber,
        name: 'Mock Broker Name',
        state: state,
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        status: 'active',
      };
    }

    return { found: false };
  }

  /**
   * Submit verification request
   */
  async submitVerification(dto: SubmitVerificationDto): Promise<BrokerVerification> {
    // Validate broker exists
    const broker = await this.brokerRepository.findOne({
      where: { id: dto.brokerId },
    });

    if (!broker) {
      throw new NotFoundException('Broker not found');
    }

    // Validate PAN format
    const panFormatValid = this.validatePanFormat(dto.panNumber);
    if (!panFormatValid) {
      throw new BadRequestException('Invalid PAN card format. Expected format: ABCDE1234F');
    }

    // Validate RERA format if provided
    let reraFormatValid = true;
    let reraLookupResult: ReraLookupResult | null = null;

    if (dto.reraNumber && dto.reraStates && dto.reraStates.length > 0) {
      reraFormatValid = this.validateReraFormat(dto.reraNumber, dto.reraStates[0]);
      
      // Attempt RERA lookup
      try {
        reraLookupResult = await this.simulateReraLookup(dto.reraNumber, dto.reraStates[0]);
      } catch (error) {
        console.error('RERA lookup failed:', error);
        reraLookupResult = { found: false };
      }
    }

    // Check for existing pending verification
    const existingVerification = await this.verificationRepository.findOne({
      where: {
        brokerId: dto.brokerId,
        status: VerificationStatus.PENDING,
      },
    });

    let submissionCount = 1;
    let previousVerificationId: string | null = null;

    if (existingVerification) {
      submissionCount = existingVerification.submissionCount + 1;
      previousVerificationId = existingVerification.id;
      
      // Update existing verification
      existingVerification.panNumber = dto.panNumber;
      existingVerification.panCardUrl = dto.panCardUrl;
      existingVerification.reraNumber = dto.reraNumber;
      existingVerification.reraCertificateUrl = dto.reraCertificateUrl;
      existingVerification.reraStates = dto.reraStates;
      existingVerification.gstNumber = dto.gstNumber;
      existingVerification.businessLicenseUrl = dto.businessLicenseUrl;
      existingVerification.panFormatValid = panFormatValid;
      existingVerification.reraFormatValid = reraFormatValid;
      existingVerification.reraLookupResult = reraLookupResult ? JSON.stringify(reraLookupResult) : undefined;
      existingVerification.submissionCount = submissionCount;
      existingVerification.status = VerificationStatus.PENDING;

      return await this.verificationRepository.save(existingVerification);
    }

    // Create new verification request
    const verification = this.verificationRepository.create({
      brokerId: dto.brokerId,
      panNumber: dto.panNumber,
      panCardUrl: dto.panCardUrl,
      reraNumber: dto.reraNumber,
      reraCertificateUrl: dto.reraCertificateUrl,
      reraStates: dto.reraStates,
      gstNumber: dto.gstNumber,
      businessLicenseUrl: dto.businessLicenseUrl,
      panFormatValid,
      reraFormatValid,
      reraLookupResult: reraLookupResult ? JSON.stringify(reraLookupResult) : undefined,
      submissionCount,
      previousVerificationId: previousVerificationId || undefined,
      status: VerificationStatus.PENDING,
    });

    const savedVerification = await this.verificationRepository.save(verification);
    return savedVerification;
  }

  /**
   * Get verification status for a broker
   */
  async getVerificationStatus(brokerId: string): Promise<BrokerVerification | null> {
    return await this.verificationRepository.findOne({
      where: { brokerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all pending verifications (for admin)
   */
  async getPendingVerifications(): Promise<BrokerVerification[]> {
    return await this.verificationRepository.find({
      where: { status: VerificationStatus.PENDING },
      relations: { broker: true },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Review verification (admin action)
   */
  async reviewVerification(dto: ReviewVerificationDto): Promise<BrokerVerification> {
    const verification = await this.verificationRepository.findOne({
      where: { id: dto.verificationId },
      relations: { broker: true },
    });

    if (!verification) {
      throw new NotFoundException('Verification request not found');
    }

    // Update verification status
    verification.status = dto.status;
    verification.reviewedBy = dto.reviewedBy;
    verification.reviewedAt = new Date();
    if (dto.reviewNotes) verification.reviewNotes = dto.reviewNotes;
    if (dto.rejectionReason) verification.rejectionReason = dto.rejectionReason;

    if (dto.status === VerificationStatus.APPROVED) {
      verification.approvedAt = new Date();

      // Update broker profile
      const broker = verification.broker;
      broker.verified = true;
      broker.panNumber = verification.panNumber;
      broker.reraNumber = verification.reraNumber || undefined;
      broker.reraStates = verification.reraStates || undefined;

      await this.brokerRepository.save(broker);
    }

    return await this.verificationRepository.save(verification);
  }

  /**
   * Get verification by ID
   */
  async getVerificationById(verificationId: string): Promise<BrokerVerification> {
    const verification = await this.verificationRepository.findOne({
      where: { id: verificationId },
      relations: { broker: true },
    });

    if (!verification) {
      throw new NotFoundException('Verification request not found');
    }

    return verification;
  }

  /**
   * Get all verifications for a broker (history)
   */
  async getBrokerVerificationHistory(brokerId: string): Promise<BrokerVerification[]> {
    return await this.verificationRepository.find({
      where: { brokerId },
      order: { createdAt: 'DESC' },
    });
  }
}
