"""
Inventory Service — Kafka Consumer
Listens to 'orders' topic and processes inventory checks/reservations.
Simulates stock validation and quantity management.
"""

import asyncio
import logging
import random
import time
import threading
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class InventoryService:
    """
    Kafka consumer service for inventory management.
    Validates stock availability and reserves inventory for incoming orders.
    """

    def __init__(self):
        self.name = "inventory-service"
        self.group_id = "inventory-service"
        self.processed_count = 0
        self.success_count = 0
        self.failure_count = 0
        self.last_heartbeat = None
        self.status = "stopped"
        self._running = False
        self._consumer = None
        self._thread = None

        # Simulated inventory store
        self._inventory = {}
        self._lock = threading.Lock()

    @property
    def metrics(self):
        return {
            "service": self.name,
            "status": self.status,
            "processed_count": self.processed_count,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "success_rate": (self.success_count / max(self.processed_count, 1)) * 100,
            "last_heartbeat": self.last_heartbeat.isoformat() if self.last_heartbeat else None,
        }

    def start(self, kafka_producer=None):
        """Start the inventory consumer in a background thread."""
        from ..kafka_config import create_consumer, TOPIC_ORDERS, TOPIC_INVENTORY_EVENTS

        self._running = True
        self.status = "starting"
        self._consumer = create_consumer(self.group_id, [TOPIC_ORDERS])

        if self._consumer is None:
            self.status = "fallback"
            logger.info(f"📦 {self.name}: Running in fallback mode (no Kafka)")
            return

        self._thread = threading.Thread(target=self._consume_loop, args=(kafka_producer,), daemon=True)
        self._thread.start()
        self.status = "running"
        logger.info(f"📦 {self.name}: Started consuming from '{TOPIC_ORDERS}'")

    def _consume_loop(self, kafka_producer):
        """Main consumer loop running in background thread."""
        from ..kafka_config import TOPIC_INVENTORY_EVENTS

        while self._running:
            try:
                if self._consumer is None:
                    break

                for message in self._consumer:
                    if not self._running:
                        break

                    order = message.value
                    self._process_order(order, kafka_producer)
                    self.last_heartbeat = datetime.now(timezone.utc)

            except Exception as e:
                if self._running:
                    logger.error(f"📦 {self.name} error: {e}")
                    time.sleep(2)

    def _process_order(self, order, kafka_producer):
        """Process an order: validate and reserve inventory."""
        order_id = order.get("order_id", "unknown")
        start_time = time.time()

        try:
            # Simulate inventory check
            items = order.get("items", [])
            all_available = True
            reserved_items = []

            for item in items:
                product_id = item.get("product_id", "")
                quantity = item.get("quantity", 0)

                # Simulate stock check (95% items in stock)
                in_stock = random.random() > 0.05
                if in_stock:
                    reserved_items.append({
                        "product_id": product_id,
                        "quantity": quantity,
                        "status": "reserved",
                        "warehouse": f"WH-{random.randint(1, 5)}"
                    })
                else:
                    all_available = False
                    reserved_items.append({
                        "product_id": product_id,
                        "quantity": quantity,
                        "status": "out_of_stock"
                    })

            # Simulate processing delay
            time.sleep(random.uniform(0.01, 0.05))

            processing_time = (time.time() - start_time) * 1000

            event = {
                "service": self.name,
                "order_id": order_id,
                "event_type": "inventory_reserved" if all_available else "inventory_insufficient",
                "success": all_available,
                "items": reserved_items,
                "processing_time_ms": round(processing_time, 2),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            # Publish result event
            if kafka_producer and kafka_producer.is_connected:
                from ..kafka_config import TOPIC_INVENTORY_EVENTS
                kafka_producer.publish(TOPIC_INVENTORY_EVENTS, event, key=order_id)

            self.processed_count += 1
            if all_available:
                self.success_count += 1
            else:
                self.failure_count += 1

            logger.info(f"📦 {self.name}: Order {order_id} — {'reserved' if all_available else 'insufficient stock'} ({processing_time:.1f}ms)")

        except Exception as e:
            self.processed_count += 1
            self.failure_count += 1
            logger.error(f"📦 {self.name}: Error processing {order_id}: {e}")

    def stop(self):
        """Stop the consumer."""
        self._running = False
        self.status = "stopped"
        if self._consumer:
            try:
                self._consumer.close()
            except Exception:
                pass
        logger.info(f"📦 {self.name}: Stopped")
