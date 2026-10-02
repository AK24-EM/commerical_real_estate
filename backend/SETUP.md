# Backend Setup Instructions

## Infrastructure Setup Complete ✅

The backend is now configured with the following infrastructure:

### Services Status:
- ✅ **Meilisearch**: Running locally on http://localhost:7700
- ✅ **TypeScript Configuration**: Fixed and compiling successfully
- ✅ **Environment Variables**: Configured for external services

## Required Configuration

You need to add your credentials to the `.env` file:

### 1. Supabase Database
Add your Supabase connection string:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT.supabase.co:5432/postgres
```

### 2. Upstash Redis
Add your Upstash Redis connection string:
```env
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_REDIS_URL.upstash.io:6379
```

### 3. Google Maps API (Optional)
For footfall calculations and maps integration:
```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GOOGLE_MAPS_API_URL=https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY_HERE&callback=console.debug&libraries=maps,marker&v=beta
```

## Starting the Backend

1. **Make sure Meilisearch is running:**
   ```bash
   /opt/homebrew/opt/meilisearch/bin/meilisearch --db-path /opt/homebrew/var/meilisearch/data.ms --master-key magicbricksMasterKey123
   ```

2. **Update `.env` with your credentials**

3. **Start the backend:**
   ```bash
   cd backend
   npm run start:dev
   ```

## Available API Endpoints

Once running, the backend will be available at `http://localhost:3000` with these endpoints:

- `GET /properties` - Get all properties
- `GET /properties/:id` - Get property by ID  
- `POST /properties` - Create property
- `GET /properties/nearby` - Geo-radius search
- `POST /lease-calculator/calculate` - Lease calculations
- `GET /footfall/calculate` - Footfall scoring
- `GET /search` - Faceted search with Meilisearch
- `POST /gst/validate` - GST validation
- `GET /gst/verify` - GST verification
- `POST /subscriptions/check-limit` - Subscription limits

## Meilisearch Configuration

Meilisearch is running locally with:
- **URL**: http://localhost:7700
- **Master Key**: magicbricksMasterKey123
- **Index**: properties (auto-configured on startup)

The search service will automatically:
- Create the properties index
- Configure filterable attributes (propertyType, isGstReady, isPowerBackup, hasLoadingDock, brokerId)
- Configure sortable attributes (carpetArea, baseRent, footfallScore)

## Next Steps

1. Add your Supabase and Upstash credentials to `.env`
2. Ensure Supabase database has PostGIS extension enabled
3. Start the backend with `npm run start:dev`
4. Test the API endpoints

## Troubleshooting

**Meilisearch connection error:**
- Make sure Meilisearch is running on port 7700
- Check the master key matches in both `.env` and the Meilisearch command

**Database connection error:**
- Verify your Supabase credentials are correct
- Ensure Supabase database is accessible
- Check that PostGIS extension is enabled in Supabase

**Build errors:**
- Run `npm install` to ensure all dependencies are installed
- Run `npm run build` to check for compilation errors
