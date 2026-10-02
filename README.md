# MagicBricks Commercial - Real Estate Platform

A comprehensive commercial real estate search and listing platform with separate interfaces for property seekers and brokers.

## 🏗️ Project Structure

```
magic_bricks/
├── backend/                 # NestJS Backend API
│   ├── src/
│   │   ├── properties/     # Property management & broker features
│   │   ├── search/         # Meilisearch integration
│   │   ├── subscriptions/  # Subscription tier system
│   │   └── auth/           # Authentication (GST verification)
│   └── package.json
│
└── magicbricks_commercial/  # Flutter Mobile App
    ├── lib/
    │   ├── features/       # Feature modules
    │   ├── models/         # Data models
    │   ├── providers/      # Riverpod state management
    │   └── services/       # API clients
    └── pubspec.yaml
```

## 🚀 Features

### For Property Seekers (Users)
- 🔍 **Advanced Search** - Filter by property type, location, price, area
- 🗺️ **Location-based Search** - Find properties within radius
- 📊 **Footfall Analytics** - POI-based footfall scoring for retail locations
- 🧮 **Lease Calculator** - Calculate total lease costs with escalations
- 💰 **Nearby Business Discovery** - Find businesses around properties
- 📐 **Floor Plan Viewer** - Interactive floor plan viewing
- ❤️ **Favorites** - Save properties for later

### For Brokers (Property Listers)
- 📝 **Property Listing Management** - Create, edit, delete listings
- 💳 **Subscription Tiers**:
  - FREE: 3 listings
  - BASIC: 10 listings (₹2,999/month) + 30-day featured
  - PROFESSIONAL: 50 listings (₹5,999/month) + 60-day featured
  - ENTERPRISE: 200 listings (₹9,999/month) + always featured
- 🔒 **Server-side Listing Limits** - Enforced with 402 Payment Required
- ⭐ **Featured Listings** - Priority in search results
- 📊 **Broker Dashboard** - Analytics and statistics
- ✅ **Verification System** - GST-based verification

### Property Types Supported
- 🏢 Office Spaces
- 🏪 Retail Outlets
- 📦 Warehouses
- 🏭 Industrial Units
- 💼 Co-Working Spaces
- 🏬 Showrooms

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with PostGIS (geospatial)
- **Search**: Meilisearch (faceted search)
- **Cache**: Redis
- **Payments**: Razorpay (subscriptions)
- **ORM**: TypeORM

### Frontend
- **Framework**: Flutter (iOS & Android)
- **State Management**: Riverpod
- **HTTP Client**: Dio with Retrofit
- **Local Storage**: Hive
- **Maps**: Google Maps
- **Payments**: Razorpay Flutter SDK

## 📋 Prerequisites

- Node.js 18+ and npm
- Flutter 3.0+
- PostgreSQL 14+
- Meilisearch (optional, for full search features)
- Redis (optional, for caching)

## 🔧 Installation & Setup

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/magicbricks
   MEILISEARCH_URL=http://localhost:7700
   MEILISEARCH_API_KEY=your_master_key
   REDIS_URL=redis://localhost:6379
   RAZORPAY_KEY_ID=your_razorpay_key
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   GOOGLE_MAPS_API_KEY=your_google_maps_key
   JWT_SECRET=your_jwt_secret
   ```

4. **Start infrastructure** (optional):
   ```bash
   docker-compose up -d
   ```

5. **Run database migrations**:
   ```bash
   npm run migration:run
   ```

6. **Start development server**:
   ```bash
   npm run start:dev
   ```

   Backend runs on `http://localhost:3000`

### Flutter App Setup

1. **Navigate to Flutter directory**:
   ```bash
   cd magicbricks_commercial
   ```

2. **Install dependencies**:
   ```bash
   flutter pub get
   ```

3. **Generate code** (for JSON serialization):
   ```bash
   flutter pub run build_runner build --delete-conflicting-outputs
   ```

4. **Configure API endpoint**:
   Edit `lib/core/constants/api_constants.dart`:
   ```dart
   static const String baseUrl = 'http://YOUR_IP:3000';
   ```

5. **Run the app**:
   ```bash
   flutter run
   ```

## 🗄️ Database Schema

### Key Entities
- **Properties** - Commercial property listings
- **Brokers** - Broker accounts and profiles
- **SubscriptionPlans** - Tier definitions
- **BrokerVerification** - GST verification records
- **FloorPlans** - Property floor plan images
- **LeaseQuotes** - Saved lease calculations

## 🔑 API Endpoints

### Properties
- `GET /properties` - List all properties
- `GET /properties/:id` - Get property details
- `POST /properties` - Create property (auth required)
- `PUT /properties/:id` - Update property (auth required)
- `DELETE /properties/:id` - Delete property (auth required)

### Search
- `GET /search` - Search with filters
- `GET /search/suggest` - Autocomplete suggestions
- `GET /search/filter-config` - Get filter configurations

### Subscriptions
- `GET /subscriptions/plans` - Get all plans
- `POST /subscriptions/initiate` - Start subscription
- `POST /subscriptions/:brokerId/upgrade` - Upgrade tier
- `POST /subscriptions/:brokerId/cancel` - Cancel subscription
- `GET /subscriptions/:brokerId/status` - Get subscription status

### Brokers
- `POST /brokers/register` - Register new broker
- `GET /brokers/:id` - Get broker profile
- `PUT /brokers/:id` - Update broker profile

### Analytics
- `POST /footfall/calculate` - Calculate footfall score
- `POST /lease/calculate` - Calculate lease costs
- `GET /nearby-businesses` - Find nearby businesses

## 🔐 Authentication

The system uses JWT-based authentication:
- Access tokens (1 hour expiry)
- Refresh tokens (7 days expiry)
- Secure token storage (flutter_secure_storage)

## 💳 Payment Integration

Razorpay subscription workflow:
1. Broker selects plan
2. Subscription created via API
3. Razorpay checkout opened
4. Webhook confirms payment
5. Broker tier updated
6. Featured status activated

## 🎨 UI/UX Features

- Material Design 3
- Custom color scheme (MagicBricks red)
- Responsive layouts
- Shimmer loading effects
- Pull-to-refresh
- Infinite scroll pagination
- Search debouncing (300ms)
- Error handling with retry

## 📱 Screens

### User Flows
1. **Home** → Property List with Search
2. **Search** → Filters → Results
3. **Property Detail** → Specifications → Floor Plan
4. **Footfall Analytics** → Map with POI scoring
5. **Lease Calculator** → Form → Results with saving

### Broker Flows
1. **Registration** → GST Verification
2. **Dashboard** → Listings Management
3. **Subscription** → Plan Selection → Payment
4. **Add Property** → Form → Listing Created

## 🚀 Deployment

### Backend
```bash
npm run build
npm run start:prod
```

### Flutter
```bash
# Android
flutter build apk --release

# iOS
flutter build ios --release
```

## 🧪 Testing

### Backend
```bash
npm run test
npm run test:e2e
```

### Flutter
```bash
flutter test
```

## 📝 Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://localhost:5432/magicbricks
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=magicbricks

# Search
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_API_KEY=magicbricksMasterKey123

# Cache
REDIS_URL=redis://localhost:6379

# Payment
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# Maps
GOOGLE_MAPS_API_KEY=AIzaSyXXXXX

# Auth
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d
```

## 🐛 Known Issues

1. **Meilisearch Optional** - App works without it but search features limited
2. **Build Performance** - TypeScript compilation can be slow
3. **Disk Space** - Keep 5GB+ free for builds

## 📚 Documentation

See additional documentation:
- [Subscription System](SUBSCRIPTION_SYSTEM_COMPLETE.md)
- [Broker Features](BROKER_FEATURE_READY.md)
- [Floor Plans](FLOOR_PLAN_FEATURE.md)
- [Footfall Analytics](FOOTFALL_COMPLETE_IMPLEMENTATION.md)
- [Admin Dashboard](ADMIN_DASHBOARD_API.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is proprietary and confidential.

## 👥 Team

Developed by MagicBricks Commercial Team

## 📞 Support

For support, contact: support@magicbricks.com
