#!/bin/bash

echo ""
echo "🚀 SBC x402 Facilitator POC Demo"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
  echo -e "${RED}❌ .env file not found${NC}"
  echo "   Please copy .env.example to .env and configure it"
  echo "   cp .env.example .env"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ .env file found${NC}"
echo ""

# Check if services are running
echo "📡 Checking services..."
echo ""

# Check facilitator
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Facilitator running on port 3001${NC}"
else
  echo -e "${YELLOW}⚠️  Facilitator not running${NC}"
  echo "   Start it with: cd packages/facilitator && npm run dev"
  echo ""
fi

# Check premium API
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Premium API running on port 3000${NC}"
else
  echo -e "${YELLOW}⚠️  Premium API not running${NC}"
  echo "   Start it with: cd packages/premium-api && npm run dev"
  echo ""
fi

echo ""
echo "💡 Make sure both services are running before proceeding!"
echo ""
read -p "Press Enter to continue..."

echo ""
echo "🤖 Running AI Agent..."
echo "====================="
echo ""

cd packages/ai-agent && npm run start

echo ""
echo "✅ Demo complete!"
echo ""
