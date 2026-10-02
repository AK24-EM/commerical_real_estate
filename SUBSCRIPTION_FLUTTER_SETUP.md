# Flutter Subscription Feature - Setup & Integration Guide

## Overview
This document covers the Flutter frontend implementation for the subscription tier system with Razorpay payment integration.

## Files Created/Modified

### Models
- **lib/models/subscription_model.dart** - Complete subscription data models
  - `SubscriptionPlan` - Plan details with pricing for all billing cycles
  - `BrokerSubscriptionStatus` - Current subscription status of a broker
  - `InitiateSubscriptionRequest/Response` - For starting new subscriptions
  - `UpgradeSubscriptionRequest` - For upgrading existing subscriptions
  - `PricingResponse` - Detailed pricing with discounts
  - Enums: `PlanTier`, `PaymentStatus`, `BillingCycle`

- **lib/models/subscription_model.g.dart** - Generated JSON serialization code

- **lib/models/broker_model.dart** - Updated with subscription fields:
  - `razorpaySubscriptionId`
  - `razorpayCustomerId`
  - `paymentStatus`
  - `lastPaymentDate`
  - `nextBillingDate`
  - `featuredUntil`
  - `isFeatured`

### Services
- **lib/services/subscription_api_client.dart** - API client for subscription endpoints
  - `getAllPlans()` - Fetch all subscription plans
  - `getPlanByTier(tier)` - Get specific plan details
  - `getBrokerStatus(brokerId)` - Get broker's current subscription status
  - `initiateSubscription()` - Start new subscription with Razorpay
  - `upgradeSubscription()` - Upgrade to higher tier
  - `cancelSubscription()` - Cancel subscription (downgrades to FREE)
  - `getPricing()` - Get pricing for tier/cycle combination

### Providers (Riverpod)
- **lib/providers/subscription_provider.dart** - State management
  - `subscriptionApiClientProvider` - DI for API client
  - `subscriptionPlansProvider` - Fetches and caches plans
  - `brokerSubscriptionStatusProvider` - Family provider for broker status
  - `subscriptionProvider` - StateNotifier for subscription actions
  - `SubscriptionNotifier` - Manages subscription flow state

### UI Components
- **lib/features/subscription/subscription_screen.dart** - Main subscription screen
  - Displays all plans with pricing
  - Billing cycle toggle (Monthly/Quarterly/Yearly)
  - Razorpay checkout integration
  - Success/error handling
  - Plan comparison cards
  - FAQ section

- **lib/features/subscription/upgrade_prompt_dialog.dart** - Upgrade prompt
  - Shows when broker reaches listing limit
  - Displays current plan and usage
  - CTA to view plans
  - Helper function `showUpgradePrompt()`

## Architecture

### Data Flow
```
User Action → Provider → API Client → Backend → Razorpay
                ↓                                    ↓
            UI Update ← Provider ← Webhook ← Razorpay
```

### Razorpay Integration Flow
1. User selects plan and billing cycle
2. Flutter calls `initiateSubscription()` endpoint
3. Backend creates Razorpay subscription and returns `subscriptionId` + `shortUrl`
4. Flutter opens Razorpay checkout with subscription ID
5. User completes payment
6. Razorpay sends webhook to backend
7. Backend updates broker subscription status
8. Flutter receives payment success callback
9. UI refreshes to show updated subscription

## Usage Examples

### 1. Navigate to Subscription Screen
```dart
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => SubscriptionScreen(
      brokerId: currentBrokerId,
      showUpgradeOnly: false, // Show all plans
    ),
  ),
);
```

### 2. Show Upgrade Prompt (when 402 received)
```dart
// In your property creation error handler
if (error.statusCode == 402) {
  showUpgradePrompt(
    context: context,
    brokerId: broker.id,
    currentTier: broker.subscriptionTier,
    listingLimit: broker.listingLimit,
    activeListingsCount: broker.activeListingsCount,
    message: error.message, // from backend
  );
}
```

### 3. Check Subscription Status
```dart
final statusAsync = ref.watch(
  brokerSubscriptionStatusProvider(brokerId)
);

statusAsync.when(
  data: (status) {
    if (status.canAddMoreListings) {
      // Allow property creation
    } else {
      // Show upgrade prompt
    }
  },
  loading: () => CircularProgressIndicator(),
  error: (err, stack) => ErrorWidget(err),
);
```

### 4. Get Available Plans
```dart
final plansAsync = ref.watch(subscriptionPlansProvider);

plansAsync.when(
  data: (plans) {
    // Display plans
    for (final plan in plans) {
      print('${plan.name}: ${plan.getFormattedPrice(BillingCycle.monthly)}');
    }
  },
  loading: () => CircularProgressIndicator(),
  error: (err, stack) => ErrorWidget(err),
);
```

## Configuration

### Environment Setup
Ensure backend is configured with Razorpay credentials in `.env`:
```
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx
```

### Dio Configuration
The subscription API client uses the same Dio instance as other API clients. Ensure base URL is configured:
```dart
// In property_provider.dart or similar
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: 'http://localhost:3000', // or your backend URL
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
  ));
  return dio;
});
```

## Testing

### Manual Testing Flow
1. **View Plans**
   - Open subscription screen
   - Verify all 4 plans are displayed (FREE, BASIC, PROFESSIONAL, ENTERPRISE)
   - Toggle billing cycles and verify prices update
   - Check discount badges appear for quarterly/yearly

2. **Initiate Subscription**
   - Select a paid plan
   - Click "Subscribe Now"
   - Verify loading dialog appears
   - Check Razorpay checkout opens
   - Complete payment with test card: 4111 1111 1111 1111

3. **Payment Success**
   - Verify success message appears
   - Check subscription status updates
   - Confirm listing limit increased
   - Verify featured status (if applicable)

4. **Listing Limit Enforcement**
   - Create properties until reaching limit
   - Attempt to create one more
   - Verify 402 error is caught
   - Check upgrade prompt appears
   - Confirm current tier and usage shown correctly

5. **Upgrade Flow**
   - From upgrade prompt, click "View Plans"
   - Select higher tier
   - Complete upgrade payment
   - Verify limit increases
   - Check old subscription is cancelled

### Test Cards (Razorpay Test Mode)
- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002
- **3D Secure**: 4000 0000 0000 3220
- CVV: Any 3 digits
- Expiry: Any future date

## Error Handling

### Common Errors
1. **402 Payment Required**
   ```dart
   if (error.response?.statusCode == 402) {
     showUpgradePrompt(...);
   }
   ```

2. **Payment Failed**
   ```dart
   void _handlePaymentError(PaymentFailureResponse response) {
     ScaffoldMessenger.of(context).showSnackBar(
       SnackBar(
         content: Text('Payment failed: ${response.message}'),
         backgroundColor: AppColors.error,
       ),
     );
   }
   ```

3. **Network Errors**
   ```dart
   try {
     await apiClient.initiateSubscription(...);
   } catch (e) {
     // Show error message
     ScaffoldMessenger.of(context).showSnackBar(
       SnackBar(content: Text(e.toString())),
     );
   }
   ```

## Backend Integration Points

### API Endpoints Used
```
GET    /subscriptions/plans              - Get all plans
GET    /subscriptions/plans/:tier        - Get specific plan
GET    /subscriptions/:brokerId/status   - Get broker status
POST   /subscriptions/initiate            - Initiate subscription
POST   /subscriptions/:brokerId/upgrade   - Upgrade subscription
POST   /subscriptions/:brokerId/cancel    - Cancel subscription
GET    /subscriptions/pricing/:tier/:cycle - Get pricing
```

### Expected Response Formats
See `subscription_model.dart` for complete TypeScript-to-Dart mappings.

## Next Steps (Tasks 10-12)

### Task 10: Listing Limit Enforcement UI
- Add error handler in property creation flow
- Catch 402 response from POST /properties
- Show upgrade prompt dialog
- Test with broker at capacity

### Task 11: Featured Badge Display
- Add featured badge to property cards
- Show boost indicator on property details
- Display "Featured" label in search results
- Highlight featured listings with gold border

### Task 12: Admin Dashboard
- Create admin endpoints for subscription analytics
- Display revenue metrics
- Show subscription churn rate
- List all active subscriptions

## Troubleshooting

### Razorpay Checkout Not Opening
- Verify `razorpay_flutter` package is installed
- Check subscription ID is valid
- Ensure Razorpay SDK is initialized
- Test with Razorpay test mode keys

### Plans Not Loading
- Check backend is running
- Verify `/subscriptions/plans` endpoint works
- Test with Postman/curl
- Check Dio base URL configuration

### Payment Success But Status Not Updated
- Verify webhook endpoint is accessible
- Check webhook signature verification
- Test webhook with ngrok
- Review backend webhook logs

### Featured Status Not Showing
- Verify `featuredUntil` is set in broker entity
- Check `isFeatured` flag is true
- Confirm webhook handler updated featured dates
- Review featured duration calculation

## Security Notes
- Never store Razorpay keys in source code
- Use environment variables for API keys
- Verify webhook signatures on backend
- Don't trust client-side payment status
- Always validate subscription on backend before allowing actions

## Performance Considerations
- Cache subscription plans (TTL: 1 hour)
- Debounce subscription status checks
- Lazy load payment UI
- Minimize API calls during checkout flow
- Use FutureProvider for automatic caching

## References
- Razorpay Flutter SDK: https://pub.dev/packages/razorpay_flutter
- Razorpay Subscriptions API: https://razorpay.com/docs/api/subscriptions/
- Backend Webhook Setup: `backend/RAZORPAY_WEBHOOK_SETUP.md`
