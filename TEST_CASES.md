# 🧪 SwiftCart Order Manager - Test Cases

This document provides comprehensive test cases to verify that the SwiftCart Order Manager is working correctly before pushing to GitHub.

## 📋 Test Overview

- **Total Test Cases:** 12
- **Backend Tests:** 5 API endpoint tests
- **Frontend Tests:** 4 manual functionality tests
- **E2E Tests:** 3 end-to-end workflow tests
- **Automated Tests:** Backend (pytest) + Frontend (npm test)

---

## 🔧 Prerequisites

Before running tests, ensure:

1. **Backend is running:** `python server.py` (Port 8001)
2. **Frontend is running:** `npm start` (Port 3000)
3. **Dependencies installed:**
   - Backend: `pip install -r requirements.txt`
   - Frontend: `npm install`

---

## 🖥️ Backend API Tests

Run these tests in a terminal to verify backend functionality:

### Test 1: Health Check
```bash
curl -s http://localhost:8001/api/
```
**Expected Response:**
```json
{"message":"SwiftCart Order Manager API","status":"operational"}
```

### Test 2: Get Metrics (Empty State)
```bash
curl -s http://localhost:8001/api/metrics
```
**Expected Response:**
```json
{
  "total_orders": 0,
  "completed_orders": 0,
  "failed_orders": 0,
  "avg_processing_time_ms": 0.0,
  "queue_depth": 0,
  "throughput_per_sec": 1.5,
  "p95_latency_ms": 0.0,
  "p99_latency_ms": 0.0
}
```

### Test 3: Create Order
```bash
curl -X POST http://localhost:8001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "TEST-CUST-001",
    "customer_name": "Test Customer",
    "items": [
      {
        "product_id": "PROD-001",
        "name": "Test Product",
        "quantity": 2,
        "price": 25.50
      }
    ],
    "idempotency_key": "test-order-001"
  }'
```
**Expected Response:**
```json
{
  "order_id": "ORD-XXXXXXXXXXXX",
  "customer_id": "TEST-CUST-001",
  "customer_name": "Test Customer",
  "items": [...],
  "subtotal": 51.0,
  "tax": 5.1,
  "total": 56.1,
  "status": "pending",
  "idempotency_key": "test-order-001",
  "created_at": "2024-XX-XX...",
  "updated_at": "2024-XX-XX..."
}
```

### Test 4: Get Order by ID
```bash
# Replace ORDER_ID with the order_id from Test 3
curl -s http://localhost:8001/api/orders/ORD-XXXXXXXXXXXX
```
**Expected Response:** Same as Test 3 response

### Test 5: WebSocket Connection Test
```bash
# In a new terminal, run this JavaScript:
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8001/api/ws/orders');

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully');
  ws.close();
});

ws.on('error', (err) => {
  console.log('❌ WebSocket connection failed:', err.message);
});
"
```
**Expected Output:** `✅ WebSocket connected successfully`

---

## 🖱️ Frontend Manual Tests

Open `http://localhost:3000` in your browser and perform these manual tests:

### Test 6: Dashboard Loads Successfully
1. Open the browser to `http://localhost:3000`
2. Verify the page loads without errors
3. Check that the Neo-Aurora background animation is visible
4. Verify the navigation tabs are present (Dashboard, Create Order, Track Orders, Load Test)

**Expected Result:**
- ✅ Page loads successfully
- ✅ Aurora background animation visible
- ✅ Navigation tabs functional
- ✅ "SwiftCart" logo and branding visible

### Test 7: Dashboard Metrics Display
1. On the Dashboard tab, verify:
   - 4 metric cards are visible (Total Orders, Avg Latency, Queue Depth, Success Rate)
   - All cards show "0" values initially (since no orders created yet)
   - Cards have proper glassmorphism styling
   - Hover effects work on cards

**Expected Result:**
- ✅ 4 metric cards displayed
- ✅ All showing initial values
- ✅ Glass morphism effects visible
- ✅ Cards animate on hover

### Test 8: Create Order Form
1. Click "Create Order" tab
2. Fill out the form:
   - Customer Name: "Test User"
   - Add one item: Product Name "Test Item", Quantity "1", Price "10.00"
3. Click "Create Order" button
4. Verify success toast notification appears
5. Check that form resets after submission

**Expected Result:**
- ✅ Form accepts input correctly
- ✅ Order creation succeeds
- ✅ Success toast appears
- ✅ Form resets after submission

### Test 9: Order Tracking
1. Click "Track Orders" tab
2. Verify the page loads and shows order history
3. Check that the previously created order appears in the list
4. Verify order shows correct details (customer name, total, status)

**Expected Result:**
- ✅ Order tracking page loads
- ✅ Previously created order appears
- ✅ Order details display correctly
- ✅ Status shows as "pending" initially

### Test 10: Load Testing
1. Click "Load Test" tab
2. Use default settings (100 orders, 10 concurrent)
3. Click "Start Load Test" button
4. Wait for completion and verify results display
5. Check that metrics update in the results cards

**Expected Result:**
- ✅ Load test executes successfully
- ✅ Progress indication visible
- ✅ Results display with metrics
- ✅ Success/failure counts shown

---

## 🔄 End-to-End Workflow Tests

These tests verify the complete user journey:

### Test 11: Complete Order Lifecycle
1. **Create Order:** Use Test 8 steps to create an order
2. **Monitor Processing:** Watch the order status change from "pending" → "processing" → "completed"
3. **Verify Metrics:** Check that dashboard metrics update (total_orders increases)
4. **Check Tracking:** Verify order appears in Track Orders with final status

**Expected Timeline:**
- Order appears in tracking within 1-2 seconds
- Status changes: pending → processing (immediate) → completed (5-15 seconds)
- Dashboard metrics update to reflect new order

### Test 12: Real-time Updates
1. **Open two browser windows:** Dashboard and Order Tracking
2. **Create a new order** in one window
3. **Verify real-time updates** in both windows:
   - Dashboard metrics update
   - Order appears in tracking page
   - WebSocket connection indicator shows "Live"

**Expected Result:**
- ✅ Real-time updates work across pages
- ✅ WebSocket indicator shows connected
- ✅ No page refresh needed for updates

---

## 🤖 Automated Tests

### Backend Automated Tests

Create `backend/test_api.py`:

```python
import pytest
import requests
import json

BASE_URL = "http://localhost:8001/api"

def test_health_check():
    response = requests.get(f"{BASE_URL}/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "operational" in data["status"]

def test_create_order():
    order_data = {
        "customer_id": "TEST-001",
        "customer_name": "Test Customer",
        "items": [
            {
                "product_id": "PROD-001",
                "name": "Test Product",
                "quantity": 1,
                "price": 10.00
            }
        ],
        "idempotency_key": "test-order-001"
    }

    response = requests.post(f"{BASE_URL}/orders", json=order_data)
    assert response.status_code == 200
    data = response.json()
    assert "order_id" in data
    assert data["customer_name"] == "Test Customer"

def test_get_metrics():
    response = requests.get(f"{BASE_URL}/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "total_orders" in data
    assert "throughput_per_sec" in data

# Run with: pytest backend/test_api.py -v
```

### Frontend Automated Tests

Create `frontend/src/__tests__/App.test.js`:

```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('SwiftCart App', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('renders dashboard on load', async () => {
    render(<App />);

    // Should show loading initially, then dashboard content
    expect(screen.getByText(/SwiftCart/i)).toBeInTheDocument();
  });

  test('can navigate between tabs', async () => {
    render(<App />);

    // Click on Create Order tab
    fireEvent.click(screen.getByText(/Create Order/i));

    // Should show create order form
    await waitFor(() => {
      expect(screen.getByText(/Customer Information/i)).toBeInTheDocument();
    });
  });

  test('creates order successfully', async () => {
    // Mock successful API response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        order_id: 'ORD-TEST-123',
        customer_name: 'Test User',
        status: 'pending'
      })
    });

    render(<App />);

    // Navigate to create order
    fireEvent.click(screen.getByText(/Create Order/i));

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Customer Name/i), {
      target: { value: 'Test User' }
    });

    // Submit form
    fireEvent.click(screen.getByText(/Create Order/i));

    // Should show success message
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/orders', expect.any(Object));
    });
  });
});

// Run with: npm test
```

---

## ✅ Test Execution Checklist

### Quick Validation (5 minutes)
- [ ] Test 1: Health Check ✅
- [ ] Test 6: Dashboard Loads ✅
- [ ] Test 8: Create Order ✅
- [ ] Test 9: Order Tracking ✅

### Full Validation (15 minutes)
- [ ] All Backend API Tests ✅
- [ ] All Frontend Manual Tests ✅
- [ ] All E2E Workflow Tests ✅
- [ ] Automated Tests Pass ✅

### Performance Validation (Optional)
- [ ] Load test with 100 orders completes successfully
- [ ] WebSocket handles multiple connections
- [ ] Frontend responsive on mobile viewport

---

## 🚨 Troubleshooting

### Common Issues:

**Backend not responding:**
```bash
# Check if server is running
ps aux | grep python

# Restart server
cd backend && python server.py
```

**Frontend build errors:**
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

**WebSocket connection fails:**
```bash
# Check CORS settings in backend/.env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**Database connection issues:**
```bash
# Current setup uses in-memory DB
# For MongoDB, update MONGO_URL in backend/.env
```

---

## 📊 Test Results Summary

After running all tests, you should see:

| Component | Status | Details |
|-----------|--------|---------|
| Backend API | ✅ Working | All endpoints responding |
| WebSocket | ✅ Working | Real-time updates functional |
| Frontend UI | ✅ Working | All pages load and function |
| Database | ✅ Working | In-memory storage operational |
| E2E Flow | ✅ Working | Complete order lifecycle |

**Ready for GitHub!** 🚀

---

## 🔄 Continuous Testing

For ongoing development, consider:

1. **GitHub Actions** for automated testing on push
2. **Load testing** for performance regression
3. **End-to-end testing** with tools like Cypress or Playwright
4. **API testing** with Postman collections

---

## 📝 Notes

- All tests are designed to be **non-destructive**
- Tests can be run multiple times safely
- **Real-time features** require both backend and frontend running
- **Load testing** may temporarily increase system resource usage

**Happy Testing!** 🧪✨

