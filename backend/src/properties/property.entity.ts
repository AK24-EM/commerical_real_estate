import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Broker } from './broker.entity';

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column()
  propertyType!: string; // Office, Retail, Warehouse, Industrial

  @Column('float')
  carpetArea!: number;

  @Column('float')
  superBuiltUpArea!: number;

  @Column('float')
  baseRent!: number;

  @Column('float')
  escalationPercent!: number;

  @Column('int')
  escalationIntervalYears!: number;

  @Column('int')
  lockInPeriodMonths!: number;

  @Column('float')
  securityDeposit!: number;

  @Column('float')
  maintenanceCharges!: number;

  @Column({ nullable: true })
  gstNumber!: string;

  @Column({ default: false })
  isGstReady!: boolean;

  @Column({ default: false })
  isPowerBackup!: boolean;

  @Column({ default: false })
  hasLoadingDock!: boolean;

  @Column('float')
  footfallScore!: number;

  @Column('jsonb', { nullable: true })
  nearbyBusinesses!: any[];

  @Column('float')
  latitude!: number;

  @Column('float')
  longitude!: number;

  // Broker relationship (replaces old brokerId string)
  @ManyToOne(() => Broker, (broker) => broker.properties, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'brokerId' })
  broker?: Broker;

  @Column({ nullable: true })
  brokerId?: string;

  // Legacy fields (kept for backward compatibility)
  @Column({ nullable: true })
  brokerName!: string;

  @Column({ nullable: true })
  brokerPhone!: string;

  @Column({ default: false })
  isBrokerVerified!: boolean;

  @Column({ default: false })
  hasFireNoc!: boolean;

  @Column({ default: false })
  hasOccupancyCertificate!: boolean;

  @Column({ default: false })
  hasParking!: boolean;

  @Column({ nullable: true })
  floor!: string;

  @Column({ nullable: true })
  totalFloors!: number;

  @Column({ nullable: true })
  furnishing!: string;

  @Column({ nullable: true })
  facing!: string;

  @Column({ nullable: true })
  cabins!: number;

  @Column({ nullable: true })
  meetingRooms!: number;

  @Column({ nullable: true })
  workstations!: number;

  @Column({ nullable: true })
  landmark!: string;

  @Column({ nullable: true })
  reraNumber!: string;

  @Column({ nullable: true })
  city!: string;

  @Column('jsonb', { nullable: true })
  typeSpecificAttributes!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
