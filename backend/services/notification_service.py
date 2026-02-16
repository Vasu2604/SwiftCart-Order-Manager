"""
Notification Service — Kafka Consumer
Listens to 'orders' and 'order-events' topics and sends notifications.
Simulates email and SMS notification delivery.
"""

import logging
import random
import time
import threading
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Kafka consumer service for sending customer notifications.
    Sends order confirmation emails, SMS updates, and push notifications.
    """

    def __init__(self):
        self.name = "notification-service"
        self.group_id = "notification-service"
        self.processed_count = 0
        self.success_count = 0
        self.failure_count = 0
        self.emails_sent = 0
        self.sms_sent = 0
        self.last_heartbeat = None
        self.status = "stopped"
        self._running = False
        self._consumer = None
        self._thread = None

        # Recent notifications log
        self.recent_notifications = []

    @property
    def metrics(self):
        return {
            "service": self.name,
            "status": self.status,
            "processed_count": self.processed_count,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "success_rate": (self.success_count / max(self.processed_count, 1)) * 100,
            "emails_sent": self.emails_sent,
            "sms_sent": self.sms_sent,
            "last_heartbeat": self.last_heartbeat.isoformat() if self.last_heartbeat else None,
        }

    def start(self, kafka_producer=None):
        """Start the notification consumer in a background thread."""
        from ..kafka_config import create_consumer, TOPIC_ORDERS, TOPIC_ORDER_EVENTS

        self._running = True
        self.status = "starting"
        self._consumer = create_consumer(self.group_id, [TOPIC_ORDERS, TOPIC_ORDER_EVENTS])

        if self._consumer is None:
            self.status = "fallback"
            logger.info(f"🔔 {self.name}: Running in fallback mode (no Kafka)")
            return

        self._thread = threading.Thread(target=self._consume_loop, args=(kafka_producer,), daemon=True)
        self._thread.start()
        self.status = "running"
        logger.info(f"🔔 {self.name}: Started consuming")

    def _consume_loop(self, kafka_producer):
        """Main consumer loop running in background thread."""
        while self._running:
            try:
                if self._consumer is None:
                    break

                for message in self._consumer:
                    if not self._running:
                        break

                    event = message.value
                    self._process_notification(event, kafka_producer)
                    self.last_heartbeat = datetime.now(timezone.utc)

            except Exception as e:
                if self._running:
                    logger.error(f"🔔 {self.name} error: {e}")
                    time.sleep(2)

    def _process_notification(self, event, kafka_producer):
        """Process a notification for an order event."""
        order_id = event.get("order_id", "unknown")
        event_type = event.get("event_type", event.get("status", "order_created"))
        customer_name = event.get("customer_name", "Customer")
        start_time = time.time()

        try:
            # Simulate sending notifications
            time.sleep(random.uniform(0.005, 0.02))

            # Determine notification channels based on event type
            notifications = []

            # Always send email for order creation
            if "created" in str(event_type) or event_type == "pending":
                email_success = random.random() > 0.02  # 98% email delivery
                notifications.append({
                    "channel": "email",
                    "type": "order_confirmation",
                    "recipient": f"{customer_name.lower().replace(' ', '.')}@email.com",
                    "success": email_success,
                    "subject": f"Order {order_id} Confirmed"
                })
                if email_success:
                    self.emails_sent += 1

            # SMS for status changes
            if event_type in ["completed", "order_completed", "failed", "order_failed"]:
                sms_success = random.random() > 0.05  # 95% SMS delivery
                notifications.append({
                    "channel": "sms",
                    "type": "status_update",
                    "success": sms_success,
                    "message": f"Order {order_id}: {event_type}"
                })
                if sms_success:
                    self.sms_sent += 1

            processing_time = (time.time() - start_time) * 1000
            all_success = all(n["success"] for n in notifications) if notifications else True

            result_event = {
                "service": self.name,
                "order_id": order_id,
                "event_type": "notifications_sent",
                "success": all_success,
                "notifications": notifications,
                "processing_time_ms": round(processing_time, 2),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            # Publish result event
            if kafka_producer and kafka_producer.is_connected:
                from ..kafka_config import TOPIC_NOTIFICATION_EVENTS
                kafka_producer.publish(TOPIC_NOTIFICATION_EVENTS, result_event, key=order_id)

            # Keep recent notifications (last 50)
            self.recent_notifications = self.recent_notifications[-49:] + [result_event]

            self.processed_count += 1
            if all_success:
                self.success_count += 1
            else:
                self.failure_count += 1

            channels = ", ".join(n["channel"] for n in notifications) or "none"
            logger.info(f"🔔 {self.name}: Order {order_id} — notified via [{channels}] ({processing_time:.1f}ms)")

        except Exception as e:
            self.processed_count += 1
            self.failure_count += 1
            logger.error(f"🔔 {self.name}: Error processing {order_id}: {e}")

    def stop(self):
        """Stop the consumer."""
        self._running = False
        self.status = "stopped"
        if self._consumer:
            try:
                self._consumer.close()
            except Exception:
                pass
        logger.info(f"🔔 {self.name}: Stopped")
