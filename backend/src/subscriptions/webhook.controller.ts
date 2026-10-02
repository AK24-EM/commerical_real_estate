import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RazorpayService } from './razorpay.service';

/**
 * Razorpay Webhook Handler
 * 
 * CRITICAL SECURITY:
 * - Always verify webhook signature before processing
 * - Never trust webhook data without signature verification
 * - Signature prevents attackers from faking payment events
 * 
 * Webhook events we handle:
 * - subscription.activated - Subscription started after payment
 * - subscription.charged - Recurring payment received
 * - subscription.paused - Payment failed or manually paused
 * - subscription.cancelled - Subscription cancelled
 * - subscription.completed - All billing cycles completed
 * 
 * Setup in Razorpay Dashboard:
 * 1. Go to Settings > Webhooks
 * 2. Add webhook URL: https://yourdomain.com/webhooks/razorpay
 * 3. Select events: All subscription events
 * 4. Set webhook secret and add to .env as RAZORPAY_WEBHOOK_SECRET
 */
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly razorpayService: RazorpayService) {}

  /**
   * Razorpay webhook endpoint
   * POST /webhooks/razorpay
   * 
   * IMPORTANT: This endpoint must accept raw body for signature verification
   */
  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  async handleRazorpayWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
    @Body() payload: any,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log(`📥 Received Razorpay webhook: ${payload.event}`);

    // CRITICAL: Verify webhook signature to prevent fake events
    if (!signature) {
      console.error('❌ Webhook signature missing');
      throw new BadRequestException('Webhook signature required');
    }

    // Get raw body for signature verification
    const rawBody = req.rawBody?.toString('utf-8') || JSON.stringify(payload);
    
    const isValid = this.razorpayService.verifyWebhookSignature(rawBody, signature);
    
    if (!isValid) {
      console.error('❌ Invalid webhook signature - possible attack attempt');
      throw new BadRequestException('Invalid webhook signature');
    }

    console.log('✅ Webhook signature verified');

    // Route event to appropriate handler
    try {
      await this.processWebhookEvent(payload);
      
      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      
      // Return 200 even on error to prevent Razorpay retries flooding the system
      // Log the error for manual investigation
      return {
        success: false,
        message: 'Webhook processing failed - logged for investigation',
      };
    }
  }

  /**
   * Process webhook event based on type
   */
  private async processWebhookEvent(payload: any): Promise<void> {
    const event = payload.event;

    switch (event) {
      case 'subscription.activated':
        console.log('🎉 Subscription activated');
        await this.razorpayService.handleSubscriptionActivated(payload);
        break;

      case 'subscription.charged':
        console.log('💰 Payment received');
        await this.razorpayService.handleSubscriptionCharged(payload);
        break;

      case 'subscription.paused':
        console.log('⏸️  Subscription paused');
        const subscription = payload.payload?.subscription?.entity;
        if (subscription) {
          await this.razorpayService.handleSubscriptionPaused(subscription.id);
        }
        break;

      case 'subscription.cancelled':
        console.log('❌ Subscription cancelled');
        const cancelledSub = payload.payload?.subscription?.entity;
        if (cancelledSub) {
          await this.razorpayService.handleSubscriptionPaused(cancelledSub.id);
        }
        break;

      case 'subscription.completed':
        console.log('✅ Subscription completed');
        const completedSub = payload.payload?.subscription?.entity;
        if (completedSub) {
          await this.razorpayService.handleSubscriptionCompleted(completedSub.id);
        }
        break;

      case 'subscription.pending':
        console.log('⏳ Subscription pending payment');
        // No action needed - waiting for payment
        break;

      case 'subscription.halted':
        console.log('🛑 Subscription halted');
        const haltedSub = payload.payload?.subscription?.entity;
        if (haltedSub) {
          await this.razorpayService.handleSubscriptionPaused(haltedSub.id);
        }
        break;

      case 'payment.failed':
        console.log('❌ Payment failed');
        // Could notify broker about failed payment
        // For now, subscription.paused event will handle it
        break;

      default:
        console.log(`ℹ️  Unhandled webhook event: ${event}`);
    }
  }

  /**
   * Test webhook endpoint (for development only)
   * POST /webhooks/test
   * 
   * Simulates a subscription.activated event without signature verification
   * REMOVE THIS IN PRODUCTION or protect with admin authentication
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testWebhook(
    @Body() body: {
      event: string;
      subscriptionId: string;
    },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log('🧪 Test webhook triggered (DEVELOPMENT ONLY)');
    
    // Create a mock webhook payload
    const mockPayload = {
      event: body.event || 'subscription.activated',
      payload: {
        subscription: {
          entity: {
            id: body.subscriptionId,
            status: 'active',
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor(Date.now() / 1000) + 2592000, // +30 days
            charge_at: Math.floor(Date.now() / 1000) + 2592000,
          },
        },
      },
    };

    try {
      await this.processWebhookEvent(mockPayload);
      
      return {
        success: true,
        message: `Test webhook processed: ${body.event}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Test webhook failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
