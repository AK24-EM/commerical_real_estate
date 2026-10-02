#!/bin/bash

echo "🔄 Restarting Flutter App with Floor Plan Changes..."
echo ""

cd magicbricks_commercial

echo "1️⃣ Running flutter pub get..."
flutter pub get

echo ""
echo "2️⃣ Starting app..."
echo ""
echo "⚠️  IMPORTANT: When app starts, press 'R' (capital R) to HOT RESTART"
echo "   Or press 'r' (lowercase r) for hot reload"
echo "   Or stop and run: flutter run --hot"
echo ""

flutter run
