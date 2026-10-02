# Razorpay Webhook Setup Guide

## Overview
Razorpay webhooks are **critical** for the subscription system to work correctly. They notify your backend when subscription events occur (payment received, subscription cancelled, etc.).

**⚠️ SECURITY WARNING:**
Never process webhook events without signature verification. The `WebhookController` verifies all webhooks using HMAC SHA256 to prevent attackers from faking payment events.

---

## Setup Steps

### 1. Get Razorpay Credentials

1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to **Settings** → **API Keys**
3. Copy your **Key ID** and **Key Secret**
4. Use **Test Mode** for development (keys start with `rzp_test_`)
5. Use **Live Mode** for production (keys start with `rzp_live_`)

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET_123
```

**Important:** Keep `RAZORPAY_WEBHOOK_SECRET` secure and never commit it to Git.

### 3. Create Subscription Plans in Razorpay

You need to create plans in Razorpay Dashboard that match your app's tiers:

#### BASIC Plan (₹2,999/month)
1. Go to **Products** → **Subscriptions** → **Plans**
2. Click **Create Plan**
3. Fill in:
   - Plan Name: `Basic Plan`
   - Billing Interval: `Monthly`
   - Plan Amount: `299900` (in paise, ₹2,999)
   - Plan Currency: `INR`
4. Copy the Plan ID (e.g., `plan_ABC123`)
5. Update your database:
   ```sql
   UPDATE subscription_plans 
   SET razorpayPlanId = 'plan_ABC123' 
   WHERE tier = 'basic';
   ```

#### PROFESSIONAL Plan (₹5,999/month)
Same process with amount `599900`

#### ENTERPRISE Plan (₹9,999/month)
Same process with amount `999900`

### 4. Setup Webhook in Razorpay Dashboard

1. Go to **Settings** → **Webhooks**
2. Click **Create New Webhook**
3. Enter Webhook Details:
   - **Webhook URL**: `https://yourdomain.com/webhooks/razorpay`
     - For local testing: Use [ngrok](https://ngrok.com/) to expose localhost
     - Run: `ngrok http 3000`
     - Use the HTTPS URL: `https://abc123.ngrok.io/webhooks/razorpay`
   - **Secret**: Enter a strong random string (same as `RAZORPAY_WEBHOOK_SECRET`)
   - **Active Events**: Select these subscription events:
     - ✅ `subscription.activated`
     - ✅ `subscription.charged`
     - ✅ `subscription.paused`
     - ✅ `subscription.cancelled`
     - ✅ `subscription.completed`
     - ✅ `payment.failed`
4. Save the webhook

---

## Testing Webhooks

### Method 1: Using ngrok (Recommended for Development)

1. Install ngrok: `npm install -g ngrok`
2. Start your backend: `npm run start:dev`
3. Expose localhost: `ngrok http 3000`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Update webhook URL in Razorpay Dashboard
6. Create a test subscription from your app
7. Monitor ngrok console and backend logs

### Method 2: Test Endpoint (Development Only)

For quick testing without Razorpay:

```bash
curl -X POST http://localhost:3000/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{
    "event": "subscription.activated",
    "subscriptionId": "sub_ABC123"
  }'
```

**⚠️ Remove this endpoint in production!**

### Method 3: Razorpay Test Mode

1. Use test credentials (`rzp_test_*`)
2. Create subscription in your app
3. Complete test payment with Razorpay's test cards:
   - Success: `4111 1111 1111 1111`
   - CVV: Any 3 digits
   - Expiry: Any future date
4. Webhook will fire automatically

---

## Webhook Event Flow

### subscription.activated
**When:** First payment succeeds, subscription starts  
**Action:** 
- Update broker `paymentStatus` to `ACTIVE`
- Set `subscriptionStartDate` and `subscriptionEndDate`
- Calculate and set `featuredUntil` timestamp
- Set `isFeatured` to `true`

### subscription.charged
**When:** Recurring payment succeeds (monthly billing)  
**Action:**
- Update `lastPaymentDate`
- Extend `featuredUntil` timestamp
- Keep subscription active

### subscription.paused
**When:** Payment fails or manually paused  
**Action:**
- Update `paymentStatus` to `PAST_DUE`
- Set `isFeatured` to `false`
- Remove featured boost from search

### subscription.cancelled
**When:** Broker cancels or admin cancels  
**Action:**
- Update `paymentStatus` to `CANCELLED`
- Downgrade to FREE tier (3 listings)
- Remove featured status

### subscription.completed
**When:** All billing cycles completed (for fixed-term subscriptions)  
**Action:**
- Update `paymentStatus` to `EXPIRED`
- Remove featured status
- Keep listings but disable new ones until renewal

---

## Security Best Practices

### 1. Always Verify Signatures
```typescript
const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
if (!isValid) {
  throw new BadRequestException('Invalid signature');
}
```

### 2. Use HTTPS in Production
- Razorpay requires HTTPS for webhooks
- Never use HTTP in production

### 3. Rate Limiting
- Razorpay retries failed webhooks up to 20 times
- Implement rate limiting if needed

### 4. Idempotency
- Webhooks may be sent multiple times
- Design handlers to be idempotent (safe to process twice)

### 5. Log Everything
- Log all webhook events for debugging
- Store webhook payloads for audit trail

---

## Troubleshooting

### Webhook not firing

**Check:**
1. ✅ Webhook URL is correct and accessible (test with curl)
2. ✅ Backend is running and reachable
3. ✅ HTTPS is used (not HTTP)
4. ✅ Webhook is active in Razorpay Dashboard
5. ✅ Events are selected correctly

**Test:**
```bash
curl -X POST https://yourdomain.com/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -d '{"event":"subscription.activated"}'
```

### Signature verification fails

**Causes:**
- `RAZORPAY_WEBHOOK_SECRET` doesn't match Dashboard
- Raw body is not preserved (check main.ts configuration)
- Body parser is modifying request before verification

**Fix:**
1. Double-check webhook secret matches Dashboard
2. Ensure `rawBody: true` in NestFactory.create()
3. Verify body parser configuration

### Subscription not activating

**Check:**
1. Payment completed successfully
2. Webhook fired (check Razorpay Dashboard → Webhooks → Logs)
3. Signature verified (check backend logs)
4. No errors in webhook handler (check logs)
5. Broker exists in database

**Debug:**
```bash
# Check broker subscription status
curl http://localhost:3000/subscriptions/{brokerId}/status
```

---

## Monitoring

### Check Webhook Delivery

Razorpay Dashboard → Settings → Webhooks → Click on webhook → View Logs

Shows:
- ✅ Successful deliveries
- ❌ Failed deliveries with error
- 🔄 Retry attempts

### Backend Logs

Look for:
```
📥 Received Razorpay webhook: subscription.activated
✅ Webhook signature verified
🎉 Subscription activated
✅ Subscription activated for broker ABC Realty
```

---

## Production Checklist

Before going live:

- [ ] Use live Razorpay credentials (`rzp_live_*`)
- [ ] Update webhook URL to production domain
- [ ] Verify HTTPS SSL certificate is valid
- [ ] Test end-to-end subscription flow
- [ ] Remove test webhook endpoint
- [ ] Setup monitoring/alerts for failed webhooks
- [ ] Document webhook secret recovery process
- [ ] Setup backup payment method
- [ ] Test failure scenarios (payment failed, cancellation)
- [ ] Verify featured listing boost is working
- [ ] Test listing limit enforcement

---

## Support

- **Razorpay Docs:** https://razorpay.com/docs/webhooks/
- **Razorpay Support:** https://razorpay.com/support/
- **Test Cards:** https://razorpay.com/docs/payments/payments/test-card-details/

---

## Example Webhook Payload

```json
{
  "event": "subscription.activated",
  "payload": {
    "subscription": {
      "entity": {
        "id": "sub_ABC123",
        "plan_id": "plan_XYZ789",
        "customer_id": "cust_123",
        "status": "active",
        "current_start": 1696156800,
        "current_end": 1698748800,
        "charge_at": 1698748800,
        "paid_count": 1,
        "total_count": 12
      }
    }
  }
}
```

This payload is sent with an `X-Razorpay-Signature` header that must be verified before processing.
