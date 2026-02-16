"""
Apache Kafka Configuration for SwiftCart Order Manager
Provides producer and consumer factories with graceful fallback
when Kafka is unavailable (system continues to work without Kafka).
"""

import json
import logging
import os
import threading
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

KAFKA_BOOTSTRAP_SERVERS = os.environ.get('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
KAFKA_AVAILABLE = False

# Kafka Topics
TOPIC_ORDERS = 'orders'
TOPIC_ORDER_EVENTS = 'order-events'
TOPIC_INVENTORY_EVENTS = 'inventory-events'
TOPIC_PAYMENT_EVENTS = 'payment-events'
TOPIC_NOTIFICATION_EVENTS = 'notification-events'

try:
    from kafka import KafkaProducer, KafkaConsumer
    from kafka.errors import NoBrokersAvailable, KafkaError
    KAFKA_AVAILABLE = True
except ImportError:
    logger.warning("kafka-python-ng not installed. Kafka integration disabled.")
    KafkaProducer = None
    KafkaConsumer = None
    NoBrokersAvailable = Exception
    KafkaError = Exception


class KafkaOrderProducer:
    """
    Singleton Kafka producer for publishing order events.
    Falls back gracefully if Kafka is unavailable.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._producer = None
                cls._instance._connected = False
            return cls._instance

    def connect(self):
        """Attempt to connect to Kafka broker."""
        if not KAFKA_AVAILABLE:
            logger.info("Kafka library not available — running in fallback mode")
            return False

        try:
            self._producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v, default=str).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
                acks='all',
                retries=3,
                max_block_ms=5000,
            )
            self._connected = True
            logger.info(f"✅ Kafka producer connected to {KAFKA_BOOTSTRAP_SERVERS}")
            return True
        except (NoBrokersAvailable, KafkaError, Exception) as e:
            logger.warning(f"⚠️ Kafka unavailable ({e}). Running in fallback mode.")
            self._connected = False
            return False

    def publish(self, topic: str, value: dict, key: str = None):
        """
        Publish a message to a Kafka topic.
        Returns True if published, False if Kafka unavailable (fallback).
        """
        if not self._connected or not self._producer:
            logger.debug(f"Kafka fallback: would publish to '{topic}': {value.get('order_id', 'N/A')}")
            return False

        try:
            future = self._producer.send(topic, value=value, key=key)
            future.get(timeout=5)  # Block until sent
            logger.info(f"📤 Published to '{topic}': {value.get('order_id', 'N/A')}")
            return True
        except Exception as e:
            logger.error(f"Failed to publish to '{topic}': {e}")
            return False

    def flush(self):
        """Flush pending messages."""
        if self._producer:
            self._producer.flush()

    def close(self):
        """Close the producer connection."""
        if self._producer:
            self._producer.close()
            self._connected = False
            logger.info("Kafka producer closed")

    @property
    def is_connected(self):
        return self._connected


def create_consumer(group_id: str, topics: list, auto_offset_reset: str = 'earliest'):
    """
    Factory function to create a Kafka consumer.
    Returns None if Kafka is unavailable.
    """
    if not KAFKA_AVAILABLE:
        logger.warning(f"Kafka not available — cannot create consumer for group '{group_id}'")
        return None

    try:
        consumer = KafkaConsumer(
            *topics,
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id=group_id,
            value_deserializer=lambda x: json.loads(x.decode('utf-8')),
            auto_offset_reset=auto_offset_reset,
            enable_auto_commit=True,
            auto_commit_interval_ms=1000,
            consumer_timeout_ms=1000,  # Non-blocking poll
            max_poll_interval_ms=300000,
        )
        logger.info(f"✅ Kafka consumer '{group_id}' subscribed to {topics}")
        return consumer
    except (NoBrokersAvailable, KafkaError, Exception) as e:
        logger.warning(f"⚠️ Cannot create consumer '{group_id}': {e}")
        return None


# Global producer instance
producer = KafkaOrderProducer()
