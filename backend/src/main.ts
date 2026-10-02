import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for webhook signature verification
  });

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Configure JSON body parser with raw body preservation for webhooks
  app.use(json({
    verify: (req: any, res, buf) => {
      // Store raw body for webhook signature verification
      req.rawBody = buf;
    },
  }));

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Webhook endpoint: ${await app.getUrl()}/webhooks/razorpay`);
}
bootstrap();
