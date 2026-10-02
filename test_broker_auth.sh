#!/bin/bash

# Broker Authentication Test Script
# Tests the complete broker registration and login flow

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================="
echo "🧪 Broker Authentication Test"
echo "=================================="
echo ""

# Check if backend is running
echo "📡 Checking if backend is running..."
if curl -s "${BASE_URL}/properties" > /dev/null; then
    echo -e "${GREEN}✓${NC} Backend is running on ${BASE_URL}"
else
    echo -e "${RED}✗${NC} Backend is not running. Start it with: cd backend && npm run start:dev"
    exit 1
fi
echo ""

# Generate random email to avoid conflicts
RANDOM_EMAIL="test$(date +%s)@broker.com"

# Test 1: Register a new broker
echo "🔹 Test 1: Register New Broker"
echo "Email: ${RANDOM_EMAIL}"
echo ""

REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/brokers/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${RANDOM_EMAIL}\",
    \"phone\": \"+91 9876543210\",
    \"password\": \"TestPass@123\",
    \"businessName\": \"Test Realty Services\",
    \"contactPerson\": \"John Doe\",
    \"city\": \"Mumbai\",
    \"state\": \"Maharashtra\"
  }")

if echo "$REGISTER_RESPONSE" | jq -e '.success == true' > /dev/null; then
    echo -e "${GREEN}✓${NC} Registration successful"
    BROKER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.broker.id')
    echo "  Broker ID: ${BROKER_ID}"
    echo "  Business: $(echo "$REGISTER_RESPONSE" | jq -r '.broker.businessName')"
    echo "  Tier: $(echo "$REGISTER_RESPONSE" | jq -r '.broker.subscriptionTier')"
    echo "  Listing Limit: $(echo "$REGISTER_RESPONSE" | jq -r '.broker.listingLimit')"
else
    echo -e "${RED}✗${NC} Registration failed"
    echo "$REGISTER_RESPONSE" | jq .
    exit 1
fi
echo ""

# Test 2: Login with the new broker
echo "🔹 Test 2: Login with Registered Broker"
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/brokers/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${RANDOM_EMAIL}\",
    \"password\": \"TestPass@123\"
  }")

if echo "$LOGIN_RESPONSE" | jq -e '.success == true' > /dev/null; then
    echo -e "${GREEN}✓${NC} Login successful"
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
    echo "  Token: ${TOKEN}"
    echo "  Broker: $(echo "$LOGIN_RESPONSE" | jq -r '.broker.businessName')"
else
    echo -e "${RED}✗${NC} Login failed"
    echo "$LOGIN_RESPONSE" | jq .
    exit 1
fi
echo ""

# Test 3: Get broker profile
echo "🔹 Test 3: Fetch Broker Profile"
echo ""

PROFILE_RESPONSE=$(curl -s -X GET "${BASE_URL}/brokers/${BROKER_ID}/profile")

if echo "$PROFILE_RESPONSE" | jq -e '.id' > /dev/null; then
    echo -e "${GREEN}✓${NC} Profile fetched successfully"
    echo "  Business Name: $(echo "$PROFILE_RESPONSE" | jq -r '.businessName')"
    echo "  Email: $(echo "$PROFILE_RESPONSE" | jq -r '.email')"
    echo "  Verified: $(echo "$PROFILE_RESPONSE" | jq -r '.verified')"
    echo "  Status: $(echo "$PROFILE_RESPONSE" | jq -r '.status')"
else
    echo -e "${RED}✗${NC} Profile fetch failed"
    echo "$PROFILE_RESPONSE" | jq .
fi
echo ""

# Test 4: Validate PAN format
echo "🔹 Test 4: Validate PAN Format"
echo ""

PAN_RESPONSE=$(curl -s -X POST "${BASE_URL}/brokers/validate-pan" \
  -H "Content-Type: application/json" \
  -d '{"panNumber":"ABCDE1234F"}')

if echo "$PAN_RESPONSE" | jq -e '.valid == true' > /dev/null; then
    echo -e "${GREEN}✓${NC} PAN validation working"
    echo "  PAN: ABCDE1234F"
    echo "  Message: $(echo "$PAN_RESPONSE" | jq -r '.message')"
else
    echo -e "${RED}✗${NC} PAN validation failed"
fi
echo ""

# Test 5: Validate RERA format
echo "🔹 Test 5: Validate RERA Format"
echo ""

RERA_RESPONSE=$(curl -s -X POST "${BASE_URL}/brokers/validate-rera" \
  -H "Content-Type: application/json" \
  -d '{"reraNumber":"P51900012345","state":"Maharashtra"}')

if echo "$RERA_RESPONSE" | jq -e '.valid == true' > /dev/null; then
    echo -e "${GREEN}✓${NC} RERA validation working"
    echo "  RERA: P51900012345"
    echo "  State: Maharashtra"
else
    echo -e "${RED}✗${NC} RERA validation failed"
fi
echo ""

# Test 6: Get verification status
echo "🔹 Test 6: Check Verification Status"
echo ""

VERIFY_STATUS=$(curl -s -X GET "${BASE_URL}/brokers/${BROKER_ID}/verification-status")

if echo "$VERIFY_STATUS" | jq -e '.status' > /dev/null; then
    echo -e "${GREEN}✓${NC} Verification status retrieved"
    echo "  Status: $(echo "$VERIFY_STATUS" | jq -r '.status')"
    echo "  Verified: $(echo "$VERIFY_STATUS" | jq -r '.verified')"
else
    echo -e "${RED}✗${NC} Verification status check failed"
fi
echo ""

# Summary
echo "=================================="
echo "✅ All Tests Completed!"
echo "=================================="
echo ""
echo "Test Credentials Created:"
echo "  Email: ${RANDOM_EMAIL}"
echo "  Password: TestPass@123"
echo "  Broker ID: ${BROKER_ID}"
echo ""
echo "You can now test the Flutter app with these credentials:"
echo ""
echo -e "${YELLOW}Flutter Test Steps:${NC}"
echo "1. flutter run"
echo "2. Tap 'Broker' tab (5th tab)"
echo "3. Tap 'Login as Broker'"
echo "4. Enter email: ${RANDOM_EMAIL}"
echo "5. Enter password: TestPass@123"
echo "6. Should see Dashboard with broker details"
echo ""
