"""
Payment Service — Kafka Consumer
Listens to 'orders' topic and processes payment transactions.
Simulates payment validation, charging, and receipt generation.
"""

import logging
import random
import time
import threading
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class PaymentService:
    """
    Kafka consumer service for payment processing.
    Validates payment methods, processes charges, and generates receipts.
    """

    def __init__(self):
        self.name = "payment-service"
        self.group_id = "payment-service"
        self.processed_count = 0
        self.success_count = 0
        self.failure_count = 0
        self.total_revenue = 0.0
        self.last_heartbeat = None
        self.status = "stopped"
        self._running = False
        self._consumer = None
        self._thread = None

    @property
    def metrics(self):
        return {
            "service": self.name,
            "status": self.status,
            "processed_count": self.processed_count,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "success_rate": (self.success_count / max(self.processed_count, 1)) * 100,
            "total_revenue": round(self.total_revenue, 2),
            "last_heartbeat": self.last_heartbeat.isoformat() if self.last_heartbeat else None,
        }

    def start(self, kafka_producer=None):
        """Start the payment consumer in a background thread."""
        from ..kafka_config import create_consumer, TOPIC_ORDERS

        self._running = True
        self.status = "starting"
        self._consumer = create_consumer(self.group_id, [TOPIC_ORDERS])

        if self._consumer is None:
            self.status = "fallback"
            logger.info(f"💳 {self.name}: Running in fallback mode (no Kafka)")
            return

        self._thread = threading.Thread(target=self._consume_loop, args=(kafka_producer,), daemon=True)
        self._thread.start()
        self.status = "running"
        logger.info(f"💳 {self.name}: Started consuming")

    def _consume_loop(self, kafka_producer):
        """Main consumer loop running in background thread."""
        while self._running:
            try:
                if self._consumer is None:
                    break

                for message in self._consumer:
                    if not self._running:
                        break

                    order = message.value
                    self._process_payment(order, kafka_producer)
                    self.last_heartbeat = datetime.now(timezone.utc)

            except Exception as e:
                if self._running:
                    logger.error(f"💳 {self.name} error: {e}")
                    time.sleep(2)

    def _process_payment(self, order, kafka_producer):
        """Process payment for an order."""
        order_id = order.get("order_id", "unknown")
        total = order.get("total", 0)
        start_time = time.time()

        try:
            # Simulate payment gateway processing
            time.sleep(random.uniform(0.02, 0.08))

            # Simulate payment success (97% success rate)
            payment_success = random.random() > 0.03

            # Choose simulated payment method
            payment_methods = ["credit_card", "debit_card", "digital_wallet", "bank_transfer"]
            payment_method = random.choice(payment_methods)

            processing_time = (time.time() - start_time) * 1000

            if payment_success:
                self.total_revenue += total

            event = {
                "service": self.name,
                "order_id": order_id,
                "event_type": "payment_completed" if payment_success else "payment_failed",
                "success": payment_success,
                "amount": total,
                "payment_method": payment_method,
                "transaction_id": f"TXN-{random.randint(100000, 999999)}",
                "processing_time_ms": round(processing_time, 2),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            # Publish result event
            if kafka_producer and kafka_producer.is_connected:
                from ..kafka_config import TOPIC_PAYMENT_EVENTS
                kafka_producer.publish(TOPIC_PAYMENT_EVENTS, event, key=order_id)

            self.processed_count += 1
            if payment_success:
                self.success_count += 1
            else:
                self.failure_count += 1

            logger.info(
                f"💳 {self.name}: Order {order_id} — "
                f"{'charged' if payment_success else 'declined'} "
                f"${total:.2f} via {payment_method} ({processing_time:.1f}ms)"
            )

        except Exception as e:
            self.processed_count += 1
            self.failure_count += 1
            logger.error(f"💳 {self.name}: Error processing {order_id}: {e}")

    def stop(self):
        """Stop the consumer."""
        self._running = False
        self.status = "stopped"
        if self._consumer:
            try:
                self._consumer.close()
            except Exception:
                pass
        logger.info(f"💳 {self.name}: Stopped")
