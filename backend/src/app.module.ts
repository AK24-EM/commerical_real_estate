import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertiesModule } from './properties/properties.module';
import { AuthModule } from './auth/auth.module';
import { SearchModule } from './search/search.module';
import { SubscriptionModule } from './subscriptions/subscription.module';
import { Property } from './properties/property.entity';
import { LeaseQuote } from './properties/lease-quote.entity';
import { FloorPlan } from './properties/floor-plan.entity';
import { Broker } from './properties/broker.entity';
import { BrokerVerification } from './properties/broker-verification.entity';
import { SubscriptionPlan } from './subscriptions/subscription-plan.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: './magicbricks.db',
      entities: [
        Property,
        LeaseQuote,
        FloorPlan,
        Broker,
        BrokerVerification,
        SubscriptionPlan,
      ],
      synchronize: true,
      logging: true,
    }),
    SearchModule,
    PropertiesModule,
    AuthModule,
    SubscriptionModule,
  ],
})
export class AppModule {}
