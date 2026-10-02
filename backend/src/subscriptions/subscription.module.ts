import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionController } from './subscription.controller';
import { WebhookController } from './webhook.controller';
import { AdminSubscriptionController } from './admin-subscription.controller';
import { SubscriptionService } from './subscription.service';
import { RazorpayService } from './razorpay.service';
import { SubscriptionPlan } from './subscription-plan.entity';
import { SubscriptionPlanSeedService } from './subscription-plan-seed.service';
import { PropertiesModule } from '../properties/properties.module';
import { Broker } from '../properties/broker.entity';
import { Property } from '../properties/property.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionPlan, Broker, Property]),
    PropertiesModule,
  ],
  controllers: [SubscriptionController, WebhookController, AdminSubscriptionController],
  providers: [SubscriptionService, RazorpayService, SubscriptionPlanSeedService],
  exports: [SubscriptionPlanSeedService, RazorpayService, TypeOrmModule],
})
export class SubscriptionModule {}
