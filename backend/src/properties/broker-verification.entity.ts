import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Broker } from './broker.entity';

export enum VerificationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RESUBMISSION_REQUIRED = 'resubmission_required',
}

export enum DocumentType {
  PAN_CARD = 'pan_card',
  RERA_CERTIFICATE = 'rera_certificate',
  BUSINESS_LICENSE = 'business_license',
  GST_CERTIFICATE = 'gst_certificate',
  ID_PROOF = 'id_proof',
}

@Entity('broker_verifications')
export class BrokerVerification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Broker, (broker) => broker.verifications)
  @JoinColumn({ name: 'brokerId' })
  broker!: Broker;

  @Column()
  brokerId!: string;

  // Document information
  @Column()
  panNumber!: string;

  @Column({ nullable: true })
  panCardUrl?: string; // URL to uploaded PAN card image

  @Column({ nullable: true })
  reraNumber?: string;

  @Column({ nullable: true })
  reraCertificateUrl?: string; // URL to RERA certificate

  @Column({ type: 'simple-array', nullable: true })
  reraStates?: string[]; // States where RERA is registered

  @Column({ nullable: true })
  gstNumber?: string;

  @Column({ nullable: true })
  businessLicenseUrl?: string;

  // Verification status
  @Column({
    type: 'varchar',
    default: VerificationStatus.PENDING,
  })
  status!: VerificationStatus;

  // Auto-validation results
  @Column({ default: false })
  panFormatValid!: boolean;

  @Column({ default: false })
  reraFormatValid!: boolean;

  @Column({ nullable: true })
  reraLookupResult?: string; // JSON string with RERA lookup data

  // Admin review
  @Column({ nullable: true })
  reviewedBy?: string; // Admin user ID

  @Column({ nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'text', nullable: true })
  reviewNotes?: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  // Submission tracking
  @Column({ default: 1 })
  submissionCount!: number; // Track resubmissions

  @Column({ nullable: true })
  previousVerificationId?: string; // Link to previous attempt if resubmission

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  approvedAt?: Date;
}
