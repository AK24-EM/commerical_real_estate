import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('lease_quotes')
export class LeaseQuote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  quoteNumber!: string;

  @Column({ nullable: true })
  propertyId!: string;

  @Column({ nullable: true })
  propertyTitle!: string;

  @Column({ nullable: true })
  clientName!: string;

  @Column({ nullable: true })
  clientCompany!: string;

  @Column('float')
  carpetArea!: number;

  @Column('float')
  baseRentPerSqFt!: number;

  @Column('float')
  camChargesPerSqFt!: number;

  @Column('float')
  escalationPercent!: number;

  @Column('int')
  escalationIntervalYears!: number;

  @Column('int')
  tenureYears!: number;

  @Column('int', { default: 6 })
  securityDepositMonths!: number;

  @Column('int', { default: 0 })
  rentFreeFitOutMonths!: number;

  @Column('int', { default: 36 })
  lockInPeriodMonths!: number;

  @Column('boolean', { default: false })
  fitOutAmortization!: boolean;

  @Column('float', { default: 0 })
  fitOutCost!: number;

  @Column('float')
  totalCostOfOccupancy!: number;

  @Column('float')
  netOccupancyCost!: number;

  @Column('float')
  averageMonthlyRent!: number;

  @Column('simple-json')
  calculationDetails!: any;

  @CreateDateColumn()
  createdAt!: Date;
}
