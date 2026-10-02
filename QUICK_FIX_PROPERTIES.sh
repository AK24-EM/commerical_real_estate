#!/bin/bash

echo "🔧 Magic Bricks - Quick Fix for Multiple Properties"
echo "=================================================="
echo ""

# Check if backend is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ Backend is not running on http://localhost:3000"
    echo "   Please start it first: cd backend && npm run start:dev"
    exit 1
fi

echo "✅ Backend is running"
echo ""
echo "📊 Current property count:"
curl -s http://localhost:3000/properties | jq 'length'
echo ""
echo "Choose an option:"
echo "1. Reset database and re-seed (deletes all data)"
echo "2. Keep existing and add 3 new properties"
echo ""
read -p "Enter choice (1 or 2): " choice

if [ "$choice" == "1" ]; then
    echo ""
    echo "⚠️  This will delete all existing data!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" == "yes" ]; then
        echo "Stopping backend..."
        # User needs to manually stop
        echo "❗ Please:"
        echo "   1. Stop the backend (Ctrl+C in the terminal running it)"
        echo "   2. Run: rm backend/magicbricks.db"
        echo "   3. Run: cd backend && npm run start:dev"
        echo "   4. Database will auto-seed with 6 properties"
    fi
elif [ "$choice" == "2" ]; then
    echo ""
    echo "Adding 3 new properties..."
    echo ""
    
    # Add properties via API
    # Property 1
    echo "Adding: BKC Tower..."
    curl -s -X POST http://localhost:3000/properties \
      -H "Content-Type: application/json" \
      -d @- << 'PROPERTY1' > /dev/null
{
  "title": "BKC Tower - Grade A Office",
  "description": "Premium office space in Bandra Kurla Complex with stunning views",
  "propertyType": "Office",
  "carpetArea": 5000,
  "superBuiltUpArea": 6000,
  "baseRent": 180,
  "escalationPercent": 6,
  "escalationIntervalYears": 3,
  "lockInPeriodMonths": 36,
  "securityDeposit": 2500000,
  "maintenanceCharges": 30,
  "isGstReady": true,
  "isPowerBackup": true,
  "footfallScore": 9,
  "latitude": 19.0596,
  "longitude": 72.8656,
  "city": "Mumbai",
  "location": "Bandra Kurla Complex",
  "brokerId": "broker_3",
  "brokerName": "Amit Shah",
  "brokerPhone": "+91-9876543211",
  "isBrokerVerified": true,
  "hasFireNoc": true,
  "hasParking": true,
  "floor": "10",
  "furnishing": "Furnished",
  "cabins": 10,
  "meetingRooms": 5,
  "workstations": 80
}
PROPERTY1
    echo "✅ Added BKC Tower"
    
    # Property 2
    echo "Adding: Select CityWalk Retail..."
    curl -s -X POST http://localhost:3000/properties \
      -H "Content-Type: application/json" \
      -d @- << 'PROPERTY2' > /dev/null
{
  "title": "Select CityWalk - Prime Retail",
  "description": "High footfall retail space in premium Delhi mall",
  "propertyType": "Retail",
  "carpetArea": 1200,
  "superBuiltUpArea": 1500,
  "baseRent": 220,
  "escalationPercent": 8,
  "escalationIntervalYears": 2,
  "lockInPeriodMonths": 60,
  "securityDeposit": 1500000,
  "maintenanceCharges": 45,
  "isGstReady": true,
  "isPowerBackup": true,
  "footfallScore": 10,
  "latitude": 28.5355,
  "longitude": 77.2488,
  "city": "Delhi",
  "location": "Saket",
  "brokerId": "broker_4",
  "brokerName": "Priya Verma",
  "brokerPhone": "+91-9876543212",
  "isBrokerVerified": true,
  "hasFireNoc": true,
  "hasParking": true,
  "floor": "Ground",
  "furnishing": "Semi-Furnished"
}
PROPERTY2
    echo "✅ Added Select CityWalk"
    
    # Property 3
    echo "Adding: IndiQube Koramangala..."
    curl -s -X POST http://localhost:3000/properties \
      -H "Content-Type: application/json" \
      -d @- << 'PROPERTY3' > /dev/null
{
  "title": "IndiQube Koramangala",
  "description": "Modern co-working space with flexible seating options",
  "propertyType": "CoWorking",
  "carpetArea": 3000,
  "superBuiltUpArea": 3500,
  "baseRent": 95,
  "escalationPercent": 5,
  "escalationIntervalYears": 1,
  "lockInPeriodMonths": 12,
  "securityDeposit": 500000,
  "maintenanceCharges": 20,
  "isGstReady": true,
  "isPowerBackup": true,
  "footfallScore": 8,
  "latitude": 12.9352,
  "longitude": 77.6245,
  "city": "Bangalore",
  "location": "Koramangala 5th Block",
  "brokerId": "broker_5",
  "brokerName": "Sneha Reddy",
  "brokerPhone": "+91-9876543213",
  "isBrokerVerified": true,
  "hasFireNoc": true,
  "hasParking": true,
  "floor": "2",
  "furnishing": "Fully Furnished"
}
PROPERTY3
    echo "✅ Added IndiQube Koramangala"
    
    echo ""
    echo "✅ Successfully added 3 properties!"
    echo ""
    echo "📊 New property count:"
    curl -s http://localhost:3000/properties | jq 'length'
    echo ""
    echo "🎉 Done! Restart your Flutter app to see all properties."
else
    echo "Invalid choice"
fi
