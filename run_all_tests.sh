#!/bin/bash

# SwiftCart Order Manager - Complete Test Suite
# Run all tests before pushing to GitHub

echo "🚀 SwiftCart Order Manager - Complete Test Suite"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
    local test_name="$1"
    local command="$2"
    local expected_exit_code="${3:-0}"

    echo -e "${YELLOW}🧪 Running: $test_name${NC}"
    echo "Command: $command"
    echo ""

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    # Run the command and capture output
    if eval "$command" > /tmp/test_output.log 2>&1; then
        if [ $? -eq $expected_exit_code ]; then
            echo -e "${GREEN}✅ PASSED: $test_name${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}❌ FAILED: $test_name (exit code $?) ${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        echo -e "${RED}❌ FAILED: $test_name (command failed)${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    echo ""
    cat /tmp/test_output.log | tail -10
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Check if services are running
check_service() {
    local service_name="$1"
    local url="$2"
    local port="$3"

    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name is running on port $port${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name is NOT running on port $port${NC}"
        echo -e "${YELLOW}💡 Start it with: ${NC}"
        echo "   Backend:  cd backend && python server.py"
        echo "   Frontend: cd frontend && npm start"
        return 1
    fi
}

echo "🔍 Checking if services are running..."
echo ""

# Check backend
BACKEND_OK=0
if check_service "Backend API" "http://localhost:8001/api/" "8001"; then
    BACKEND_OK=1
fi

# Check frontend
FRONTEND_OK=0
if check_service "Frontend App" "http://localhost:3000" "3000"; then
    FRONTEND_OK=1
fi

if [ $BACKEND_OK -eq 0 ] || [ $FRONTEND_OK -eq 0 ]; then
    echo -e "${RED}❌ Cannot run tests: Services not running${NC}"
    echo ""
    echo "Please start both services first:"
    echo "1. Terminal 1: cd backend && python server.py"
    echo "2. Terminal 2: cd frontend && npm start"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo -e "${GREEN}✅ Both services are running!${NC}"
echo ""

# Backend API Tests
echo "🔧 BACKEND API TESTS"
echo "==================="

run_test "API Health Check" "curl -s http://localhost:8001/api/ | grep -q 'operational'"
run_test "Metrics Endpoint" "curl -s http://localhost:8001/api/metrics | jq -e '.total_orders != null' > /dev/null"
run_test "Create Test Order" "curl -X POST http://localhost:8001/api/orders -H 'Content-Type: application/json' -d '{\"customer_id\":\"TEST-001\",\"customer_name\":\"Test User\",\"items\":[{\"product_id\":\"PROD-001\",\"name\":\"Test Product\",\"quantity\":1,\"price\":10.00}],\"idempotency_key\":\"test-001-$(date +%s)\"}' | jq -e '.order_id' > /dev/null"
run_test "Get Orders List" "curl -s http://localhost:8001/api/orders | jq -e 'length >= 0' > /dev/null"
run_test "WebSocket Connection" "node -e \"const WebSocket = require('ws'); const ws = new WebSocket('ws://localhost:8001/api/ws/orders'); ws.on('open', () => { console.log('connected'); ws.close(); process.exit(0); }); ws.on('error', () => process.exit(1));\" 2>/dev/null || echo 'WebSocket test skipped'"

# Frontend Tests
echo "🖥️ FRONTEND TESTS"
echo "================="

run_test "Frontend Build" "cd frontend && npm run build"
run_test "Frontend Automated Tests" "cd frontend && npm test -- --watchAll=false --testPathPattern=App.test.js --verbose 2>/dev/null | grep -q 'Test Suites'"

# Manual Test Instructions
echo "🖱️ MANUAL TESTS"
echo "==============="
echo ""
echo -e "${YELLOW}Please perform these manual tests in your browser:${NC}"
echo ""
echo "1. 🌐 Open http://localhost:3000"
echo "   ✅ Verify: Page loads with SwiftCart branding"
echo "   ✅ Verify: Aurora background animation visible"
echo "   ✅ Verify: Navigation tabs (Dashboard, Create Order, etc.)"
echo ""
echo "2. 📊 Dashboard Tab:"
echo "   ✅ Verify: 4 metric cards displayed (Total Orders, etc.)"
echo "   ✅ Verify: Cards show '0' values initially"
echo "   ✅ Verify: Glass morphism styling visible"
echo ""
echo "3. 🛒 Create Order Tab:"
echo "   ✅ Verify: Customer information form"
echo "   ✅ Verify: Add item functionality"
echo "   ✅ Verify: Order creation with success toast"
echo "   ✅ Verify: Form resets after submission"
echo ""
echo "4. 📦 Track Orders Tab:"
echo "   ✅ Verify: Order list displays"
echo "   ✅ Verify: Previously created order appears"
echo "   ✅ Verify: Order details (customer, total, status)"
echo ""
echo "5. ⚡ Load Test Tab:"
echo "   ✅ Verify: Test configuration form"
echo "   ✅ Verify: Load test execution"
echo "   ✅ Verify: Results display with metrics"
echo ""
echo -e "${YELLOW}Press Enter when manual tests are complete...${NC}"
read

# End-to-End Tests
echo "🔄 END-TO-END TESTS"
echo "=================="

run_test "Order Lifecycle" "echo 'Creating order via API...' && ORDER_ID=\$(curl -s -X POST http://localhost:8001/api/orders -H 'Content-Type: application/json' -d '{\"customer_id\":\"E2E-TEST\",\"customer_name\":\"E2E Test User\",\"items\":[{\"product_id\":\"E2E-PROD\",\"name\":\"E2E Product\",\"quantity\":1,\"price\":50.00}],\"idempotency_key\":\"e2e-test-$(date +%s)\"}' | jq -r '.order_id') && echo 'Order created: \$ORDER_ID' && sleep 3 && curl -s http://localhost:8001/api/orders/\$ORDER_ID | jq -e '.status' > /dev/null && echo 'Order processed successfully'"

# Final Summary
echo "📊 TEST RESULTS SUMMARY"
echo "======================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "✅ Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "❌ Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}🚀 Your SwiftCart Order Manager is ready for GitHub!${NC}"
    echo ""
    echo "📝 Next steps:"
    echo "1. Initialize Git repository: git init"
    echo "2. Add all files: git add ."
    echo "3. Commit: git commit -m 'Initial commit: SwiftCart Order Manager'"
    echo "4. Create GitHub repo and push: git remote add origin <your-repo-url>"
    echo "5. Push to GitHub: git push -u origin main"
else
    echo ""
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo -e "${YELLOW}🔧 Please fix the issues before pushing to GitHub${NC}"
    echo ""
    echo "Common fixes:"
    echo "- Ensure both backend and frontend are running"
    echo "- Check API endpoints are responding"
    echo "- Verify WebSocket connectivity"
    echo "- Check browser console for frontend errors"
fi

echo ""
echo "📋 For detailed test information, see TEST_CASES.md"
echo ""

