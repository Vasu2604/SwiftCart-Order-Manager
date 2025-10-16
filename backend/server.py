from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import json
import time
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# In-memory storage for testing (replace with MongoDB in production)
import asyncio
from collections import defaultdict

# Simple in-memory database replacement for testing
class InMemoryDB:
    def __init__(self):
        self.idempotency_keys = {}
        self.orders_queue = []
        self.orders = {}
        self.order_events = []
        self._lock = asyncio.Lock()

    async def insert_one(self, collection, doc):
        async with self._lock:
            if collection == 'idempotency_keys':
                self.idempotency_keys[doc['key']] = doc
                return type('Result', (), {'inserted_id': doc.get('_id', 'test-id')})()
            elif collection == 'orders_queue':
                self.orders_queue.append(doc)
                return type('Result', (), {'inserted_id': 'test-id'})()
            elif collection == 'order_events':
                self.order_events.append(doc)
                return type('Result', (), {'inserted_id': 'test-id'})()

    async def find_one(self, collection, query, projection=None):
        async with self._lock:
            if collection == 'idempotency_keys':
                key = query.get('key')
                return self.idempotency_keys.get(key)
            elif collection == 'orders_queue':
                for order in self.orders_queue:
                    if order.get('order_id') == query.get('order_id'):
                        return order
                    if query.get('processed') is False and not order.get('processed'):
                        return order
                return None
            elif collection == 'orders':
                order_id = query.get('order_id')
                return self.orders.get(order_id)

    async def update_one(self, collection, query, update, upsert=False):
        async with self._lock:
            if collection == 'orders':
                order_id = query.get('order_id')
                if order_id in self.orders or upsert:
                    if order_id not in self.orders:
                        self.orders[order_id] = {}
                    if '$set' in update:
                        self.orders[order_id].update(update['$set'])
                    return type('Result', (), {'modified_count': 1})()
            elif collection == 'orders_queue':
                for i, order in enumerate(self.orders_queue):
                    if order.get('order_id') == query.get('order_id'):
                        if '$set' in update:
                            self.orders_queue[i].update(update['$set'])
                        return type('Result', (), {'modified_count': 1})()
            return type('Result', (), {'modified_count': 0})()

    async def count_documents(self, collection, query=None):
        async with self._lock:
            if collection == 'orders':
                if query:
                    status = query.get('status')
                    return len([o for o in self.orders.values() if o.get('status') == status])
                return len(self.orders)
            elif collection == 'orders_queue':
                if query:
                    processed = query.get('processed')
                    return len([o for o in self.orders_queue if o.get('processed') == processed])
                return len(self.orders_queue)

    async def aggregate(self, collection, pipeline):
        async with self._lock:
            if collection == 'orders':
                # Simple aggregation for testing
                if len(pipeline) >= 2 and pipeline[0].get('$match') and pipeline[1].get('$group'):
                    times = [o.get('processing_time_ms', 0) for o in self.orders.values() if o.get('processing_time_ms')]
                    if times:
                        return [{'avg': sum(times) / len(times), 'times': times}]
            return []

    async def to_list(self, collection, limit=None):
        async with self._lock:
            if collection == 'orders':
                orders = list(self.orders.values())
                return orders[-limit:] if limit else orders
            return []

    async def sort(self, collection, field, direction=-1):
        # Simplified sorting for testing
        return self

# Use in-memory DB for testing
db = InMemoryDB()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class OrderItem(BaseModel):
    product_id: str
    name: str
    quantity: int
    price: float

class OrderCreate(BaseModel):
    customer_id: str
    customer_name: str
    items: List[OrderItem]
    idempotency_key: Optional[str] = None

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    order_id: str
    customer_id: str
    customer_name: str
    items: List[OrderItem]
    subtotal: float
    tax: float
    total: float
    status: str  # pending, processing, completed, failed
    idempotency_key: str
    created_at: datetime
    updated_at: datetime
    processing_time_ms: Optional[float] = None

class OrderEvent(BaseModel):
    event_id: str
    order_id: str
    event_type: str  # order_created, order_processing, order_completed, order_failed
    timestamp: datetime
    data: Dict[str, Any]

class MetricsResponse(BaseModel):
    total_orders: int
    completed_orders: int
    failed_orders: int
    avg_processing_time_ms: float
    queue_depth: int
    throughput_per_sec: float
    p95_latency_ms: float
    p99_latency_ms: float

class LoadTestRequest(BaseModel):
    num_orders: int = 100
    concurrent_requests: int = 10

class LoadTestResult(BaseModel):
    total_orders: int
    successful: int
    failed: int
    total_time_sec: float
    avg_latency_ms: float
    throughput_per_sec: float

# Background worker state
worker_running = False

# Helper functions
def generate_order_id():
    return f"ORD-{uuid.uuid4().hex[:12].upper()}"

def generate_event_id():
    return f"EVT-{uuid.uuid4().hex[:12].upper()}"

async def ensure_indexes():
    """Create necessary indexes for performance and uniqueness"""
    # In-memory DB doesn't need indexes for testing
    pass

# Routes
@api_router.get("/")
async def root():
    return {"message": "SwiftCart Order Manager API", "status": "operational"}

@api_router.post("/orders", response_model=Order)
async def create_order(order_input: OrderCreate):
    """Order Ingest Service - Idempotent order submission"""
    start_time = time.time()
    
    # Generate or use provided idempotency key
    idempotency_key = order_input.idempotency_key or f"{order_input.customer_id}-{uuid.uuid4().hex[:8]}"
    
    # Check idempotency - prevent duplicate processing
    existing = await db.find_one("idempotency_keys", {"key": idempotency_key})
    if existing:
        # Return existing order
        existing_order = await db.find_one("orders", {"order_id": existing["order_id"]})
        if existing_order:
            return Order(**existing_order)
        raise HTTPException(status_code=409, detail="Duplicate idempotency key")
    
    # Calculate totals
    subtotal = sum(item.quantity * item.price for item in order_input.items)
    tax = subtotal * 0.1  # 10% tax
    total = subtotal + tax
    
    # Create order
    order_id = generate_order_id()
    now = datetime.now(timezone.utc)
    
    order = Order(
        order_id=order_id,
        customer_id=order_input.customer_id,
        customer_name=order_input.customer_name,
        items=order_input.items,
        subtotal=subtotal,
        tax=tax,
        total=total,
        status="pending",
        idempotency_key=idempotency_key,
        created_at=now,
        updated_at=now
    )
    
    # Insert into orders_queue (simulates Kafka producer)
    queue_doc = order.model_dump()
    queue_doc['created_at'] = queue_doc['created_at'].isoformat()
    queue_doc['updated_at'] = queue_doc['updated_at'].isoformat()
    queue_doc['processed'] = False

    try:
        # Atomic insert with idempotency key
        await db.insert_one("idempotency_keys", {
            "key": idempotency_key,
            "order_id": order_id,
            "created_at": now.isoformat()
        })
        await db.insert_one("orders_queue", queue_doc)
        
        # Track ingestion time
        ingestion_time = (time.time() - start_time) * 1000
        logger.info(f"Order {order_id} ingested in {ingestion_time:.2f}ms")
        
        return order
    except Exception as e:
        logger.error(f"Failed to ingest order: {e}")
        raise HTTPException(status_code=500, detail="Failed to process order")

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    """Order Status Service - Get order details"""
    order = await db.find_one("orders", {"order_id": order_id})
    if not order:
        # Check if still in queue
        queued = await db.find_one("orders_queue", {"order_id": order_id})
        if queued:
            return Order(**queued)
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**order)

@api_router.get("/orders", response_model=List[Order])
async def list_orders(limit: int = 50):
    """List recent orders"""
    orders = await db.to_list("orders", limit)
    return [Order(**order) for order in orders]

@api_router.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    """System metrics dashboard"""
    # Count orders by status
    total_orders = await db.count_documents("orders")
    completed_orders = await db.count_documents("orders", {"status": "completed"})
    failed_orders = await db.count_documents("orders", {"status": "failed"})

    # Queue depth
    queue_depth = await db.count_documents("orders_queue", {"processed": False})

    # Processing time statistics
    stats = await db.aggregate("orders", [
        {"$match": {"processing_time_ms": {"$exists": True, "$ne": None}}},
        {"$group": {
            "_id": None,
            "avg": {"$avg": "$processing_time_ms"},
            "times": {"$push": "$processing_time_ms"}
        }}
    ])

    avg_processing_time = stats[0]["avg"] if stats else 0.0

    # Calculate percentiles
    times = sorted(stats[0]["times"]) if stats else []
    p95_latency = times[int(len(times) * 0.95)] if times else 0.0
    p99_latency = times[int(len(times) * 0.99)] if times else 0.0

    # Throughput (orders per second in last minute)
    one_min_ago = datetime.now(timezone.utc).timestamp() - 60
    # Simplified throughput calculation for testing
    throughput = 1.5  # Mock value for testing

    return MetricsResponse(
        total_orders=total_orders,
        completed_orders=completed_orders,
        failed_orders=failed_orders,
        avg_processing_time_ms=avg_processing_time,
        queue_depth=queue_depth,
        throughput_per_sec=throughput,
        p95_latency_ms=p95_latency,
        p99_latency_ms=p99_latency
    )

@api_router.post("/load-test", response_model=LoadTestResult)
async def run_load_test(request: LoadTestRequest):
    """Load test harness"""
    import aiohttp
    
    backend_url = os.environ.get('BACKEND_URL', 'http://localhost:8001')
    
    successful = 0
    failed = 0
    latencies = []
    
    start_time = time.time()
    
    async def create_test_order(session, index):
        nonlocal successful, failed
        order_start = time.time()
        
        order_data = {
            "customer_id": f"CUST-{index}",
            "customer_name": f"Test Customer {index}",
            "items": [
                {
                    "product_id": f"PROD-{random.randint(1, 100)}",
                    "name": f"Product {random.randint(1, 100)}",
                    "quantity": random.randint(1, 5),
                    "price": round(random.uniform(10, 500), 2)
                }
                for _ in range(random.randint(1, 5))
            ],
            "idempotency_key": f"load-test-{uuid.uuid4().hex}"
        }
        
        try:
            async with session.post(f"{backend_url}/api/orders", json=order_data) as resp:
                if resp.status == 200:
                    successful += 1
                else:
                    failed += 1
                latency = (time.time() - order_start) * 1000
                latencies.append(latency)
        except Exception as e:
            failed += 1
            logger.error(f"Load test error: {e}")
    
    async with aiohttp.ClientSession() as session:
        # Run in batches
        for i in range(0, request.num_orders, request.concurrent_requests):
            batch_size = min(request.concurrent_requests, request.num_orders - i)
            tasks = [create_test_order(session, i + j) for j in range(batch_size)]
            await asyncio.gather(*tasks)
    
    total_time = time.time() - start_time
    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    throughput = successful / total_time if total_time > 0 else 0
    
    return LoadTestResult(
        total_orders=request.num_orders,
        successful=successful,
        failed=failed,
        total_time_sec=total_time,
        avg_latency_ms=avg_latency,
        throughput_per_sec=throughput
    )

@app.websocket("/api/ws/orders")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time order updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Background Order Processor (simulates Spark Structured Streaming)
async def order_processor_worker():
    """Background worker that processes orders from queue"""
    logger.info("Order Processor Worker started")

    while worker_running:
        try:
            # Poll orders_queue (simulates Kafka consumer)
            unprocessed = await db.find_one("orders_queue", {"processed": False})

            if unprocessed:
                start_time = time.time()
                order_id = unprocessed["order_id"]

                logger.info(f"Processing order {order_id}")

                # Simulate processing: validation → enrichment → calculation
                await asyncio.sleep(random.uniform(0.05, 0.2))  # Simulate work

                # Update status to processing
                unprocessed["status"] = "processing"
                unprocessed["updated_at"] = datetime.now(timezone.utc).isoformat()

                # Broadcast to WebSocket clients
                await manager.broadcast({
                    "type": "order_update",
                    "order_id": order_id,
                    "status": "processing"
                })

                # Simulate enrichment (inventory check, etc.)
                success = random.random() > 0.05  # 95% success rate

                if success:
                    unprocessed["status"] = "completed"
                else:
                    unprocessed["status"] = "failed"

                processing_time = (time.time() - start_time) * 1000
                unprocessed["processing_time_ms"] = processing_time
                unprocessed["updated_at"] = datetime.now(timezone.utc).isoformat()

                # Persist to orders collection
                await db.update_one("orders", {"order_id": order_id}, {"$set": unprocessed}, upsert=True)

                # Mark as processed in queue
                await db.update_one("orders_queue", {"order_id": order_id}, {"$set": {"processed": True}})

                # Publish event (simulates Kafka producer to order-events topic)
                event = OrderEvent(
                    event_id=generate_event_id(),
                    order_id=order_id,
                    event_type=f"order_{unprocessed['status']}",
                    timestamp=datetime.now(timezone.utc),
                    data=unprocessed
                )

                event_doc = event.model_dump()
                event_doc['timestamp'] = event_doc['timestamp'].isoformat()
                await db.insert_one("order_events", event_doc)

                # Broadcast final status
                await manager.broadcast({
                    "type": "order_update",
                    "order_id": order_id,
                    "status": unprocessed["status"],
                    "processing_time_ms": processing_time
                })

                logger.info(f"Order {order_id} {unprocessed['status']} in {processing_time:.2f}ms")
            else:
                # No orders in queue, wait
                await asyncio.sleep(0.5)

        except Exception as e:
            logger.error(f"Error in order processor: {e}")
            await asyncio.sleep(1)

@app.on_event("startup")
async def startup_event():
    global worker_running
    worker_running = True
    
    # Ensure indexes
    await ensure_indexes()
    
    # Start background worker
    asyncio.create_task(order_processor_worker())
    logger.info("SwiftCart Order Manager started")

@app.on_event("shutdown")
async def shutdown_event():
    global worker_running
    worker_running = False
    client.close()
    logger.info("SwiftCart Order Manager shutdown")

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Main execution block
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
