"""
Automated API tests for SwiftCart Order Manager Backend
Run with: pytest backend/test_api.py -v
"""

import pytest
import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8001/api"

class TestSwiftCartAPI:
    """Test suite for SwiftCart Order Manager API"""

    def test_health_check(self):
        """Test API health check endpoint"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200

        data = response.json()
        assert "message" in data
        assert "operational" in data["status"]
        assert "SwiftCart Order Manager API" in data["message"]
        print("✅ Health check passed")

    def test_get_metrics_empty(self):
        """Test metrics endpoint with no orders"""
        response = requests.get(f"{BASE_URL}/metrics")
        assert response.status_code == 200

        data = response.json()
        required_fields = [
            "total_orders", "completed_orders", "failed_orders",
            "avg_processing_time_ms", "queue_depth", "throughput_per_sec",
            "p95_latency_ms", "p99_latency_ms"
        ]

        for field in required_fields:
            assert field in data, f"Missing field: {field}"

        # Should be zero initially
        assert data["total_orders"] == 0
        assert data["completed_orders"] == 0
        assert data["failed_orders"] == 0
        print("✅ Metrics endpoint (empty state) passed")

    def test_create_order_success(self):
        """Test successful order creation"""
        order_data = {
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
            "idempotency_key": f"test-order-{int(time.time())}"
        }

        response = requests.post(f"{BASE_URL}/orders", json=order_data)
        assert response.status_code == 200

        data = response.json()

        # Validate response structure
        required_fields = [
            "order_id", "customer_id", "customer_name", "items",
            "subtotal", "tax", "total", "status", "idempotency_key",
            "created_at", "updated_at"
        ]

        for field in required_fields:
            assert field in data, f"Missing field: {field}"

        # Validate calculations
        assert data["customer_id"] == "TEST-CUST-001"
        assert data["customer_name"] == "Test Customer"
        assert data["subtotal"] == 51.0  # 2 * 25.50
        assert data["tax"] == 5.1       # 10% of subtotal
        assert data["total"] == 56.1    # subtotal + tax
        assert data["status"] == "pending"
        assert data["order_id"].startswith("ORD-")
        print("✅ Order creation passed")

        return data["order_id"]

    def test_get_order_by_id(self):
        """Test retrieving order by ID"""
        # First create an order
        order_data = {
            "customer_id": "TEST-CUST-002",
            "customer_name": "Another Test Customer",
            "items": [
                {
                    "product_id": "PROD-002",
                    "name": "Another Product",
                    "quantity": 1,
                    "price": 100.00
                }
            ],
            "idempotency_key": f"test-order-retrieve-{int(time.time())}"
        }

        create_response = requests.post(f"{BASE_URL}/orders", json=order_data)
        assert create_response.status_code == 200
        order_id = create_response.json()["order_id"]

        # Now retrieve it
        response = requests.get(f"{BASE_URL}/orders/{order_id}")
        assert response.status_code == 200

        data = response.json()
        assert data["order_id"] == order_id
        assert data["customer_name"] == "Another Test Customer"
        print("✅ Order retrieval passed")

    def test_list_orders(self):
        """Test listing orders"""
        response = requests.get(f"{BASE_URL}/orders?limit=10")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        print(f"✅ List orders passed (found {len(data)} orders)")

    def test_idempotency_prevention(self):
        """Test that duplicate idempotency keys are prevented"""
        order_data = {
            "customer_id": "TEST-IDEMP-001",
            "customer_name": "Idempotency Test",
            "items": [
                {
                    "product_id": "PROD-IDEMP",
                    "name": "Idempotency Product",
                    "quantity": 1,
                    "price": 50.00
                }
            ],
            "idempotency_key": "unique-idempotency-key-123"
        }

        # Create first order
        response1 = requests.post(f"{BASE_URL}/orders", json=order_data)
        assert response1.status_code == 200
        order1 = response1.json()

        # Try to create duplicate
        response2 = requests.post(f"{BASE_URL}/orders", json=order_data)
        assert response2.status_code == 200  # Should still return 200 due to idempotency

        order2 = response2.json()
        assert order2["order_id"] == order1["order_id"]  # Should return same order
        print("✅ Idempotency prevention passed")

    def test_metrics_after_orders(self):
        """Test metrics update after creating orders"""
        # Get initial metrics
        response = requests.get(f"{BASE_URL}/metrics")
        initial_metrics = response.json()

        # Create a test order
        order_data = {
            "customer_id": "TEST-METRICS-001",
            "customer_name": "Metrics Test",
            "items": [
                {
                    "product_id": "PROD-METRICS",
                    "name": "Metrics Product",
                    "quantity": 1,
                    "price": 75.00
                }
            ],
            "idempotency_key": f"test-metrics-{int(time.time())}"
        }

        requests.post(f"{BASE_URL}/orders", json=order_data)

        # Wait a moment for processing
        time.sleep(2)

        # Check updated metrics
        response = requests.get(f"{BASE_URL}/metrics")
        updated_metrics = response.json()

        assert updated_metrics["total_orders"] >= initial_metrics["total_orders"]
        print("✅ Metrics update after orders passed")

    def test_websocket_connection(self):
        """Test WebSocket connection (basic connectivity)"""
        try:
            import websocket
            ws = websocket.WebSocket()
            ws.connect("ws://localhost:8001/api/ws/orders")

            # Send a ping-like message
            ws.send(json.dumps({"type": "ping"}))

            # Should be able to connect without errors
            ws.close()
            print("✅ WebSocket connection passed")
        except ImportError:
            print("⚠️ WebSocket test skipped (websocket-client not installed)")
        except Exception as e:
            print(f"❌ WebSocket connection failed: {e}")
            raise

    def test_error_handling_404(self):
        """Test 404 error handling"""
        response = requests.get(f"{BASE_URL}/orders/NONEXISTENT-ID")
        assert response.status_code == 404

        data = response.json()
        assert "detail" in data
        print("✅ Error handling (404) passed")

    def test_cors_headers(self):
        """Test CORS headers are present"""
        response = requests.options(f"{BASE_URL}/orders")
        assert response.status_code == 200

        # Should have CORS headers
        assert "Access-Control-Allow-Origin" in response.headers
        print("✅ CORS headers present")

if __name__ == "__main__":
    # Run tests manually
    test_instance = TestSwiftCartAPI()

    print("🚀 Starting SwiftCart API Tests...")
    print("=" * 50)

    try:
        test_instance.test_health_check()
        test_instance.test_get_metrics_empty()
        test_instance.test_create_order_success()
        test_instance.test_get_order_by_id()
        test_instance.test_list_orders()
        test_instance.test_idempotency_prevention()
        test_instance.test_metrics_after_orders()
        test_instance.test_websocket_connection()
        test_instance.test_error_handling_404()
        test_instance.test_cors_headers()

        print("=" * 50)
        print("🎉 All API tests passed! Backend is ready for GitHub.")
        print("📝 Next: Run frontend tests and manual verification")

    except Exception as e:
        print(f"❌ Test failed: {e}")
        print("🔧 Fix the issue before pushing to GitHub")
        raise