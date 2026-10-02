import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { PropertyRepository } from './property.repository';
import { LeaseCalculatorController } from './lease-calculator.controller';
import { LeaseCalculatorService } from './lease-calculator.service';
import { FootfallController } from './footfall-calculator.controller';
import { FootfallCalculatorService } from './footfall-calculator.service';
import { FloorPlanController } from './floor-plan.controller';
import { FloorPlanService } from './floor-plan.service';
import { SeedService } from './seed.service';
import { NearbyBusinessController } from './nearby-business.controller';
import { NearbyBusinessService } from './nearby-business.service';
import { BrokerController } from './broker.controller';
import { BrokerService } from './broker.service';
import { BrokerVerificationService } from './broker-verification.service';
import { AdminController } from './admin.controller';
import { ListingLimitGuard } from './guards/listing-limit.guard';
import { Property } from './property.entity';
import { LeaseQuote } from './lease-quote.entity';
import { FloorPlan } from './floor-plan.entity';
import { Broker } from './broker.entity';
import { BrokerVerification } from './broker-verification.entity';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Property,
      LeaseQuote,
      FloorPlan,
      Broker,
      BrokerVerification,
    ]),
    SearchModule,
  ],
  controllers: [
    PropertyController,
    LeaseCalculatorController,
    FootfallController,
    FloorPlanController,
    NearbyBusinessController,
    BrokerController,
    AdminController,
  ],
  providers: [
    PropertyService,
    PropertyRepository,
    LeaseCalculatorService,
    FootfallCalculatorService,
    FloorPlanService,
    SeedService,
    NearbyBusinessService,
    BrokerService,
    BrokerVerificationService,
    ListingLimitGuard,
  ],
  exports: [PropertyRepository, PropertyService, BrokerService, ListingLimitGuard, TypeOrmModule],
})
export class PropertiesModule {}
