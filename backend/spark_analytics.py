"""
Apache Spark Structured Streaming — Order Analytics
Reads from Kafka 'orders' topic and computes real-time aggregations.

Usage:
  pip install pyspark
  python spark_analytics.py

Or with spark-submit:
  spark-submit --packages org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0 spark_analytics.py
"""

import os
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

KAFKA_BOOTSTRAP_SERVERS = os.environ.get('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')


def run_spark_streaming():
    """
    Run Spark Structured Streaming job that reads orders from Kafka
    and computes real-time aggregations.
    """
    try:
        from pyspark.sql import SparkSession
        from pyspark.sql.functions import (
            from_json, col, window, count, sum as spark_sum,
            avg, explode, current_timestamp
        )
        from pyspark.sql.types import (
            StructType, StructField, StringType, FloatType,
            IntegerType, ArrayType, TimestampType
        )
    except ImportError:
        logger.error("PySpark not installed. Run: pip install pyspark")
        sys.exit(1)

    # Initialize Spark Session
    spark = SparkSession.builder \
        .appName("SwiftCart-OrderAnalytics") \
        .master("local[*]") \
        .config("spark.sql.shuffle.partitions", "2") \
        .config("spark.streaming.stopGracefullyOnShutdown", "true") \
        .getOrCreate()

    spark.sparkContext.setLogLevel("WARN")
    logger.info("✅ Spark session initialized")

    # Define order schema
    order_schema = StructType([
        StructField("order_id", StringType(), True),
        StructField("customer_id", StringType(), True),
        StructField("customer_name", StringType(), True),
        StructField("items", ArrayType(StructType([
            StructField("product_id", StringType(), True),
            StructField("name", StringType(), True),
            StructField("quantity", IntegerType(), True),
            StructField("price", FloatType(), True),
        ])), True),
        StructField("subtotal", FloatType(), True),
        StructField("tax", FloatType(), True),
        StructField("total", FloatType(), True),
        StructField("status", StringType(), True),
        StructField("created_at", StringType(), True),
    ])

    # Read from Kafka
    raw_df = spark.readStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS) \
        .option("subscribe", "orders") \
        .option("startingOffsets", "latest") \
        .option("failOnDataLoss", "false") \
        .load()

    # Parse JSON value
    orders_df = raw_df \
        .selectExpr("CAST(value AS STRING) as json_str", "timestamp") \
        .select(
            from_json(col("json_str"), order_schema).alias("order"),
            col("timestamp").alias("event_time")
        ) \
        .select("order.*", "event_time")

    logger.info("📊 Starting streaming queries...")

    # ─── Query 1: Orders Per Minute ───────────────────────────
    opm_query = orders_df \
        .withWatermark("event_time", "2 minutes") \
        .groupBy(window(col("event_time"), "1 minute", "30 seconds")) \
        .agg(
            count("*").alias("order_count"),
            spark_sum("total").alias("total_revenue"),
            avg("total").alias("avg_order_value")
        ) \
        .select(
            col("window.start").alias("window_start"),
            col("window.end").alias("window_end"),
            "order_count",
            "total_revenue",
            "avg_order_value"
        ) \
        .writeStream \
        .outputMode("update") \
        .format("console") \
        .option("truncate", "false") \
        .queryName("orders_per_minute") \
        .trigger(processingTime="10 seconds") \
        .start()

    logger.info("✅ Orders per minute query started")

    # ─── Query 2: Top Products (Last 5 Minutes) ──────────────
    items_df = orders_df \
        .select(explode("items").alias("item"), "event_time") \
        .select(
            col("item.product_id").alias("product_id"),
            col("item.name").alias("product_name"),
            col("item.quantity").alias("quantity"),
            col("item.price").alias("price"),
            "event_time"
        )

    top_products_query = items_df \
        .withWatermark("event_time", "5 minutes") \
        .groupBy(
            window(col("event_time"), "5 minutes", "1 minute"),
            "product_id",
            "product_name"
        ) \
        .agg(
            spark_sum("quantity").alias("total_quantity"),
            spark_sum(col("quantity") * col("price")).alias("total_revenue")
        ) \
        .writeStream \
        .outputMode("update") \
        .format("console") \
        .option("truncate", "false") \
        .queryName("top_products") \
        .trigger(processingTime="15 seconds") \
        .start()

    logger.info("✅ Top products query started")

    # ─── Query 3: Revenue Summary ────────────────────────────
    revenue_query = orders_df \
        .withWatermark("event_time", "10 minutes") \
        .groupBy(window(col("event_time"), "5 minutes", "1 minute")) \
        .agg(
            count("*").alias("order_count"),
            spark_sum("total").alias("total_revenue"),
            avg("total").alias("avg_order_value"),
            spark_sum("tax").alias("total_tax")
        ) \
        .writeStream \
        .outputMode("update") \
        .format("console") \
        .option("truncate", "false") \
        .queryName("revenue_summary") \
        .trigger(processingTime="20 seconds") \
        .start()

    logger.info("✅ Revenue summary query started")
    logger.info("=" * 60)
    logger.info("🚀 All Spark streaming queries active!")
    logger.info("   Waiting for orders from Kafka topic 'orders'...")
    logger.info("   Press Ctrl+C to stop")
    logger.info("=" * 60)

    # Wait for all queries
    try:
        spark.streams.awaitAnyTermination()
    except KeyboardInterrupt:
        logger.info("Shutting down Spark streaming...")
        for q in spark.streams.active:
            q.stop()
        spark.stop()
        logger.info("✅ Spark stopped gracefully")


if __name__ == "__main__":
    run_spark_streaming()
