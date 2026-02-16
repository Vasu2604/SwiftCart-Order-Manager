"""
SwiftCart Microservices Package
Consumer services for event-driven order processing via Apache Kafka.
"""

from .inventory_service import InventoryService
from .payment_service import PaymentService
from .notification_service import NotificationService
from .analytics_service import AnalyticsService

__all__ = [
    'InventoryService',
    'PaymentService',
    'NotificationService',
    'AnalyticsService',
]
