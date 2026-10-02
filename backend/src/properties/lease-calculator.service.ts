import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaseQuote } from './lease-quote.entity';

export interface LeaseCalculationRequest {
  baseRent?: number;
  baseRentPerSqFt?: number;
  carpetArea?: number;
  camCharges?: number;
  camChargesPerSqFt?: number;
  escalationPercent: number;
  escalationIntervalYears?: number;
  leaseTermYears?: number;
  tenureYears?: number;
  securityDepositMonths?: number;
  rentFreeFitOutMonths?: number;
  lockInPeriodMonths?: number;
  fitOutAmortization?: boolean;
  fitOutCost?: number;
  gstPercent?: number;
}

export interface YearlyRent {
  year: number;
  monthlyRent: number;
  monthlyRentPerSqFt: number;
  yearlyRent: number;
  monthlyCAM: number;
  yearlyCAM: number;
  gst: number;
  total: number;
  isLockedIn: boolean;
}

export interface LeaseCalculationResponse {
  yearlyBreakdown: YearlyRent[];
  totalRent: number;
  totalCAM: number;
  totalGST: number;
  securityDeposit: number;
  rentFreeSavings: number;
  fitOutCost: number;
  totalCostOfOccupancy: number; // Gross commitment
  netOccupancyCost: number;    // Net P&L (gross minus refundable deposit and recoverable GST)
  averageMonthlyRent: number;
  effectivePerSqFtRent: number;
  gstItcCredit: number;
}

export interface SaveQuoteDto extends LeaseCalculationRequest {
  propertyId?: string;
  propertyTitle?: string;
  clientName?: string;
  clientCompany?: string;
}

@Injectable()
export class LeaseCalculatorService {
  constructor(
    @InjectRepository(LeaseQuote)
    private readonly quoteRepo: Repository<LeaseQuote>,
  ) {}

  calculateLease(request: LeaseCalculationRequest): LeaseCalculationResponse {
    const tenureYears = request.tenureYears || request.leaseTermYears || 5;
    const carpetArea = request.carpetArea || 10000;
    const escalationPercent = request.escalationPercent ?? 5;
    const escalationIntervalYears = request.escalationIntervalYears && request.escalationIntervalYears > 0 ? request.escalationIntervalYears : 1;
    const securityDepositMonths = request.securityDepositMonths ?? 6;
    const rentFreeFitOutMonths = request.rentFreeFitOutMonths ?? 0;
    const lockInPeriodMonths = request.lockInPeriodMonths ?? 36;
    const gstPercent = request.gstPercent ?? 18;
    const fitOutAmortization = !!request.fitOutAmortization;
    const fitOutCost = request.fitOutCost ?? 0;

    // Determine monthly base rent
    let monthlyBaseRent: number;
    if (request.baseRentPerSqFt !== undefined && request.baseRentPerSqFt > 0) {
      monthlyBaseRent = request.baseRentPerSqFt * carpetArea;
    } else if (request.baseRent !== undefined && request.baseRent > 0) {
      // If baseRent is passed, check if it's per sq ft (< 1000) or total
      monthlyBaseRent = request.baseRent < 1000 ? request.baseRent * carpetArea : request.baseRent;
    } else {
      monthlyBaseRent = 145 * carpetArea;
    }

    // Determine monthly CAM charges
    let monthlyCAM: number;
    if (request.camChargesPerSqFt !== undefined && request.camChargesPerSqFt > 0) {
      monthlyCAM = request.camChargesPerSqFt * carpetArea;
    } else if (request.camCharges !== undefined && request.camCharges > 0) {
      monthlyCAM = request.camCharges < 500 ? request.camCharges * carpetArea : request.camCharges;
    } else {
      monthlyCAM = 18 * carpetArea;
    }

    const yearlyBreakdown: YearlyRent[] = [];
    let currentMonthlyRent = monthlyBaseRent;
    let totalRent = 0;
    let totalCAM = 0;
    let totalGST = 0;

    for (let year = 1; year <= tenureYears; year++) {
      // Apply escalation at defined intervals (not on year 1)
      if (year > 1 && (year - 1) % escalationIntervalYears === 0) {
        currentMonthlyRent = currentMonthlyRent * (1 + escalationPercent / 100);
      }

      // Rent-free fit-out logic for Year 1
      let payingMonths = 12;
      let yearlyRentForThisYear = 0;

      if (year === 1 && rentFreeFitOutMonths > 0) {
        payingMonths = Math.max(0, 12 - Math.min(12, rentFreeFitOutMonths));
        yearlyRentForThisYear = currentMonthlyRent * payingMonths;
      } else {
        yearlyRentForThisYear = currentMonthlyRent * 12;
      }

      const yearlyCAMForThisYear = monthlyCAM * 12;
      const yearlyGst = ((yearlyRentForThisYear + yearlyCAMForThisYear) * gstPercent) / 100;
      const yearlyTotal = yearlyRentForThisYear + yearlyCAMForThisYear + yearlyGst;
      const isLockedIn = year * 12 <= lockInPeriodMonths;

      yearlyBreakdown.push({
        year,
        monthlyRent: Math.round(currentMonthlyRent * 100) / 100,
        monthlyRentPerSqFt: Math.round((currentMonthlyRent / carpetArea) * 100) / 100,
        yearlyRent: Math.round(yearlyRentForThisYear * 100) / 100,
        monthlyCAM: Math.round(monthlyCAM * 100) / 100,
        yearlyCAM: Math.round(yearlyCAMForThisYear * 100) / 100,
        gst: Math.round(yearlyGst * 100) / 100,
        total: Math.round(yearlyTotal * 100) / 100,
        isLockedIn,
      });

      totalRent += yearlyRentForThisYear;
      totalCAM += yearlyCAMForThisYear;
      totalGST += yearlyGst;
    }

    // Security deposit = months * (first month rent + CAM)
    const securityDeposit = securityDepositMonths * (monthlyBaseRent + monthlyCAM);

    // Rent-free savings
    const rentFreeSavings = rentFreeFitOutMonths * monthlyBaseRent;

    // Gross Commitment / Total Cost of Occupancy
    const totalCostOfOccupancy = totalRent + totalCAM + totalGST + securityDeposit + (fitOutAmortization ? fitOutCost : 0);

    // Net Occupancy Cost (excluding refundable deposit and recoverable GST under ITC Section 16)
    const netOccupancyCost = totalRent + totalCAM + (fitOutAmortization ? fitOutCost : 0);

    // Averages
    const totalMonths = tenureYears * 12;
    const averageMonthlyRent = totalCostOfOccupancy / totalMonths;
    const effectivePerSqFtRent = netOccupancyCost / totalMonths / carpetArea;

    return {
      yearlyBreakdown,
      totalRent: Math.round(totalRent * 100) / 100,
      totalCAM: Math.round(totalCAM * 100) / 100,
      totalGST: Math.round(totalGST * 100) / 100,
      securityDeposit: Math.round(securityDeposit * 100) / 100,
      rentFreeSavings: Math.round(rentFreeSavings * 100) / 100,
      fitOutCost: fitOutAmortization ? fitOutCost : 0,
      totalCostOfOccupancy: Math.round(totalCostOfOccupancy * 100) / 100,
      netOccupancyCost: Math.round(netOccupancyCost * 100) / 100,
      averageMonthlyRent: Math.round(averageMonthlyRent * 100) / 100,
      effectivePerSqFtRent: Math.round(effectivePerSqFtRent * 100) / 100,
      gstItcCredit: Math.round(totalGST * 100) / 100,
    };
  }

  async saveQuote(dto: SaveQuoteDto): Promise<{ success: boolean; quoteNumber: string; shareableUrl: string; quote: LeaseQuote }> {
    const calculation = this.calculateLease(dto);
    const carpetArea = dto.carpetArea || 10000;
    const baseRentPerSqFt = dto.baseRentPerSqFt || (dto.baseRent ? (dto.baseRent < 1000 ? dto.baseRent : dto.baseRent / carpetArea) : 145);
    const camChargesPerSqFt = dto.camChargesPerSqFt || (dto.camCharges ? (dto.camCharges < 500 ? dto.camCharges : dto.camCharges / carpetArea) : 18);
    const tenureYears = dto.tenureYears || dto.leaseTermYears || 5;

    // Generate unique quote number
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const quoteNumber = `MB-Q-${randomSuffix}`;

    const quote = this.quoteRepo.create({
      quoteNumber,
      propertyId: dto.propertyId || '',
      propertyTitle: dto.propertyTitle || 'Grade-A Commercial Space',
      clientName: dto.clientName || 'Commercial Tenant',
      clientCompany: dto.clientCompany || 'Corporate Client',
      carpetArea,
      baseRentPerSqFt,
      camChargesPerSqFt,
      escalationPercent: dto.escalationPercent ?? 5,
      escalationIntervalYears: dto.escalationIntervalYears || 1,
      tenureYears,
      securityDepositMonths: dto.securityDepositMonths ?? 6,
      rentFreeFitOutMonths: dto.rentFreeFitOutMonths ?? 0,
      lockInPeriodMonths: dto.lockInPeriodMonths ?? 36,
      fitOutAmortization: !!dto.fitOutAmortization,
      fitOutCost: dto.fitOutCost ?? 0,
      totalCostOfOccupancy: calculation.totalCostOfOccupancy,
      netOccupancyCost: calculation.netOccupancyCost,
      averageMonthlyRent: calculation.averageMonthlyRent,
      calculationDetails: calculation,
    });

    const saved = await this.quoteRepo.save(quote);
    const shareableUrl = `https://magicbricks.commercial/quotes/${saved.quoteNumber}`;

    return {
      success: true,
      quoteNumber: saved.quoteNumber,
      shareableUrl,
      quote: saved,
    };
  }

  async getQuote(identifier: string): Promise<LeaseQuote> {
    const quote = await this.quoteRepo.findOne({
      where: [{ quoteNumber: identifier }, { id: identifier }],
    });

    if (!quote) {
      throw new NotFoundException(`Lease quote ${identifier} not found`);
    }

    return quote;
  }

  async getAllQuotes(): Promise<LeaseQuote[]> {
    return this.quoteRepo.find({
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getCfoReport(quoteNumber: string) {
    const quote = await this.getQuote(quoteNumber);
    const details: LeaseCalculationResponse = quote.calculationDetails;

    return {
      quoteNumber: quote.quoteNumber,
      propertyTitle: quote.propertyTitle,
      clientName: quote.clientName,
      clientCompany: quote.clientCompany,
      date: quote.createdAt,
      keyMetrics: {
        carpetArea: `${quote.carpetArea.toLocaleString()} sq.ft`,
        tenure: `${quote.tenureYears} Years`,
        lockIn: `${quote.lockInPeriodMonths} Months`,
        baseRentPerSqFt: `₹${quote.baseRentPerSqFt}/sq.ft/mo`,
        camChargesPerSqFt: `₹${quote.camChargesPerSqFt}/sq.ft/mo`,
        escalation: `${quote.escalationPercent}% every ${quote.escalationIntervalYears} year(s)`,
        securityDeposit: `₹${(details.securityDeposit / 100000).toFixed(2)} Lakhs (${quote.securityDepositMonths} months)`,
        totalCommitment: `₹${(details.totalCostOfOccupancy / 10000000).toFixed(2)} Crores`,
        netOccupancyCost: `₹${(details.netOccupancyCost / 10000000).toFixed(2)} Crores`,
        gstRecoverableItc: `₹${(details.gstItcCredit / 100000).toFixed(2)} Lakhs`,
        effectiveMonthlyCost: `₹${Math.round(details.netOccupancyCost / (quote.tenureYears * 12)).toLocaleString()}`,
        effectivePerSqFtMonth: `₹${details.effectivePerSqFtRent.toFixed(2)}`,
      },
      yearlyBreakdown: details.yearlyBreakdown,
      taxDisclaimer: 'GST Input Tax Credit (ITC) eligibility under Section 16 of CGST Act, 2017. Security deposit is refundable upon termination subject to lock-in covenants.',
    };
  }
}
