"""
Analytics Service — Kafka Consumer + Real-Time Aggregations
Computes streaming analytics: orders/minute, revenue by region,
top products, and anomaly detection. Results exposed via API.
"""

import logging
import random
import time
import threading
from collections import defaultdict, deque
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Regions for simulated geo-data
REGIONS = ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East"]


class AnalyticsService:
    """
    Kafka consumer service for real-time order analytics.
    Computes sliding-window aggregations and anomaly detection.
    """

    def __init__(self):
        self.name = "analytics-service"
        self.group_id = "analytics-service"
        self.processed_count = 0
        self.success_count = 0
        self.failure_count = 0
        self.last_heartbeat = None
        self.status = "stopped"
        self._running = False
        self._consumer = None
        self._thread = None
        self._lock = threading.Lock()

        # Real-time analytics stores
        self._order_timestamps = deque(maxlen=10000)   # For orders/min calculation
        self._revenue_by_region = defaultdict(float)
        self._product_counts = defaultdict(int)        # product_id -> total qty
        self._product_names = {}                       # product_id -> name
        self._product_timestamps = defaultdict(deque)  # product_id -> timestamps
        self._order_totals = deque(maxlen=1000)         # For average order value
        self._recent_orders = deque(maxlen=200)         # Recent order window for anomaly detection
        self._anomalies = deque(maxlen=50)

        # Time-series for orders per minute (last 30 data points)
        self._opm_history = deque(maxlen=30)
        self._last_opm_calc = 0

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
        """Start the analytics consumer in a background thread."""
        from ..kafka_config import create_consumer, TOPIC_ORDERS

        self._running = True
        self.status = "starting"
        self._consumer = create_consumer(self.group_id, [TOPIC_ORDERS])

        if self._consumer is None:
            self.status = "fallback"
            logger.info(f"📊 {self.name}: Running in fallback mode (no Kafka)")
            return

        self._thread = threading.Thread(target=self._consume_loop, daemon=True)
        self._thread.start()
        self.status = "running"
        logger.info(f"📊 {self.name}: Started consuming")

    def _consume_loop(self):
        """Main consumer loop running in background thread."""
        while self._running:
            try:
                if self._consumer is None:
                    break

                for message in self._consumer:
                    if not self._running:
                        break

                    order = message.value
                    self._process_analytics(order)
                    self.last_heartbeat = datetime.now(timezone.utc)

            except Exception as e:
                if self._running:
                    logger.error(f"📊 {self.name} error: {e}")
                    time.sleep(2)

    def _process_analytics(self, order):
        """Process an order for analytics aggregation."""
        order_id = order.get("order_id", "unknown")
        now = time.time()

        try:
            with self._lock:
                # Track order timestamp for orders/min
                self._order_timestamps.append(now)

                # Revenue by region (simulate region assignment)
                region = random.choice(REGIONS)
                total = order.get("total", 0)
                self._revenue_by_region[region] += total

                # Track product counts
                items = order.get("items", [])
                for item in items:
                    pid = item.get("product_id", "unknown")
                    qty = item.get("quantity", 1)
                    name = item.get("name", pid)
                    self._product_counts[pid] += qty
                    self._product_names[pid] = name
                    if pid not in self._product_timestamps:
                        self._product_timestamps[pid] = deque(maxlen=500)
                    self._product_timestamps[pid].append(now)

                # Track order totals for avg value
                self._order_totals.append(total)

                # Track for anomaly detection
                self._recent_orders.append({
                    "order_id": order_id,
                    "total": total,
                    "timestamp": now,
                    "item_count": len(items)
                })

                # Anomaly detection: flag unusually large orders
                if total > 1000:
                    self._anomalies.append({
                        "type": "high_value_order",
                        "severity": "warning",
                        "order_id": order_id,
                        "detail": f"High-value order: ${total:.2f}",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })

                # Orders per minute history (update every 5 seconds)
                if now - self._last_opm_calc >= 5:
                    opm = self._calculate_orders_per_minute()
                    self._opm_history.append({
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "value": opm
                    })
                    self._last_opm_calc = now

                    # Anomaly: spike or drop in order rate
                    if len(self._opm_history) >= 3:
                        recent_vals = [p["value"] for p in list(self._opm_history)[-3:]]
                        avg_rate = sum(recent_vals) / len(recent_vals)
                        if opm > avg_rate * 3 and opm > 10:
                            self._anomalies.append({
                                "type": "order_spike",
                                "severity": "info",
                                "detail": f"Order rate spike: {opm:.1f}/min (avg: {avg_rate:.1f}/min)",
                                "timestamp": datetime.now(timezone.utc).isoformat()
                            })

            self.processed_count += 1
            self.success_count += 1

        except Exception as e:
            self.processed_count += 1
            self.failure_count += 1
            logger.error(f"📊 {self.name}: Error processing {order_id}: {e}")

    def _calculate_orders_per_minute(self):
        """Calculate current orders per minute rate."""
        now = time.time()
        cutoff = now - 60
        recent = [t for t in self._order_timestamps if t > cutoff]
        return len(recent)

    # ─── Public API Methods ───────────────────────────────────

    def get_summary(self):
        """Get analytics summary for the API."""
        with self._lock:
            opm = self._calculate_orders_per_minute()
            avg_value = sum(self._order_totals) / max(len(self._order_totals), 1)
            total_revenue = sum(self._revenue_by_region.values())

            return {
                "orders_per_minute": round(opm, 1),
                "average_order_value": round(avg_value, 2),
                "total_revenue": round(total_revenue, 2),
                "total_orders_analyzed": self.processed_count,
                "active_regions": len(self._revenue_by_region),
                "unique_products": len(self._product_counts),
                "anomaly_count": len(self._anomalies),
            }

    def get_orders_per_minute_history(self):
        """Get time-series data for orders per minute."""
        with self._lock:
            history = list(self._opm_history)
            # Add current data point
            history.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "value": self._calculate_orders_per_minute()
            })
            return history

    def get_top_products(self, limit=10):
        """Get top products by quantity sold."""
        with self._lock:
            now = time.time()
            cutoff = now - 300  # Last 5 minutes

            # Calculate recent counts
            recent_counts = {}
            for pid, timestamps in self._product_timestamps.items():
                recent = sum(1 for t in timestamps if t > cutoff)
                if recent > 0:
                    recent_counts[pid] = recent

            # Sort by count
            sorted_products = sorted(recent_counts.items(), key=lambda x: x[1], reverse=True)[:limit]

            return [
                {
                    "product_id": pid,
                    "name": self._product_names.get(pid, pid),
                    "quantity_last_5min": count,
                    "total_quantity": self._product_counts.get(pid, 0),
                }
                for pid, count in sorted_products
            ]

    def get_revenue_by_region(self):
        """Get revenue breakdown by region."""
        with self._lock:
            total = sum(self._revenue_by_region.values()) or 1
            return [
                {
                    "region": region,
                    "revenue": round(rev, 2),
                    "percentage": round((rev / total) * 100, 1),
                }
                for region, rev in sorted(
                    self._revenue_by_region.items(),
                    key=lambda x: x[1],
                    reverse=True
                )
            ]

    def get_anomalies(self, limit=20):
        """Get recent anomalies detected."""
        with self._lock:
            return list(self._anomalies)[-limit:]

    def record_order(self, order: dict):
        """
        Process an order directly (fallback when Kafka is unavailable).
        Called from the main server after order creation.
        """
        self._process_analytics(order)

    def stop(self):
        """Stop the consumer."""
        self._running = False
        self.status = "stopped"
        if self._consumer:
            try:
                self._consumer.close()
            except Exception:
                pass
        logger.info(f"📊 {self.name}: Stopped")
