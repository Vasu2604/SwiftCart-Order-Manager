# ⚡ SwiftCart Order Manager

> A high-performance, event-driven order management system built with **FastAPI**, **React**, **Apache Kafka**, and **Apache Spark** — featuring real-time analytics, microservice architecture, and a stunning Neo-Aurora UI.

![SwiftCart](images/SWIFTCARTImage.png)

---

## 🏗️ Architecture

```
┌────────────────┐       REST API        ┌──────────────────────┐
│  React Frontend│◄─────────────────────►│  FastAPI Order       │
│  (Neo-Aurora UI)│      WebSocket        │  Service             │
└────────────────┘                        └──────────┬───────────┘
                                                     │ publish
                                                     ▼
                                          ┌──────────────────────┐
                                          │   Apache Kafka       │
                                          │   Topic: orders      │
                                          └──┬────┬────┬────┬────┘
                                             │    │    │    │  consume
                                             ▼    ▼    ▼    ▼
                                    ┌────────┐┌───────┐┌──────┐┌─────────┐
                                    │Inventory││Payment││Notif.││Analytics│
                                    │Service  ││Service││Svc   ││Service  │
                                    └────────┘└───────┘└──────┘└─────────┘
                                                                    │
                                                     ┌──────────────┘
                                                     ▼
                                          ┌──────────────────────┐
                                          │  Apache Spark        │
                                          │  Structured Streaming│
                                          └──────────────────────┘
```

## ✨ Features

### Core
- **Order Management** — Create, track, and manage orders with idempotent submission
- **Real-time Updates** — WebSocket-powered live order status tracking
- **Load Testing** — Built-in load test harness with configurable concurrency

### Event-Driven Pipeline (Kafka)
- **Inventory Service** — Automated stock validation and reservation
- **Payment Service** — Simulated payment gateway processing
- **Notification Service** — Email & SMS delivery simulation
- **Analytics Service** — Real-time sliding-window aggregations and anomaly detection

### Streaming Analytics (Spark)
- **Orders Per Minute** — Windowed throughput tracking
- **Top Products** — 5-minute sliding window product rankings
- **Revenue Summary** — Running totals with tax breakdown
- **Anomaly Detection** — High-value orders, rate spikes

### Frontend Pages
| Page | Description |
|------|-------------|
| **Dashboard** | System metrics, throughput, latency stats |
| **Create Order** | Order submission with validation |
| **Track Orders** | Live order status with WebSocket updates |
| **Analytics** | Real-time charts, top products, revenue by region, anomalies |
| **Services** | Kafka broker status, consumer health, event pipeline visualization |
| **Load Test** | Configurable stress testing harness |

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.10+** and **Node.js 18+**
- **Docker** (optional, for Kafka)

### 1. Clone
```bash
git clone https://github.com/Vasu2604/SwiftCart-Order-Manager.git
cd SwiftCart-Order-Manager
```

### 2. Backend
```bash
cd backend
pip install -r requirements.txt
python server.py
```
Server starts at `http://localhost:8001`

### 3. Frontend
```bash
cd frontend
npm install
npm start
```
App opens at `http://localhost:3000`

### 4. Kafka (Optional)
```bash
# From project root
docker-compose up -d
```
> **Note:** The app works **without Kafka**. When Kafka is unavailable, all features still function in fallback mode with appropriate logging.

### 5. Spark Analytics (Optional)
```bash
python backend/spark_analytics.py
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/orders` | Create order (idempotent) |
| `GET` | `/api/orders` | List recent orders |
| `GET` | `/api/orders/{id}` | Get order by ID |
| `GET` | `/api/metrics` | System performance metrics |
| `POST` | `/api/load-test` | Run load test |
| `GET` | `/api/services/health` | Kafka + microservice health |
| `GET` | `/api/analytics/summary` | Real-time analytics overview |
| `GET` | `/api/analytics/orders-per-minute` | OPM time-series |
| `GET` | `/api/analytics/top-products` | Top products (last 5 min) |
| `GET` | `/api/analytics/revenue-by-region` | Revenue breakdown |
| `GET` | `/api/analytics/anomalies` | Detected anomalies |
| `WS` | `/api/ws/orders` | Live order updates |

---

## 📁 Project Structure

```
SwiftCart-Order-Manager/
├── backend/
│   ├── server.py                 # FastAPI app + Kafka producer + API routes
│   ├── kafka_config.py           # Kafka producer/consumer with fallback
│   ├── spark_analytics.py        # PySpark Structured Streaming job
│   ├── services/
│   │   ├── inventory_service.py  # Stock validation consumer
│   │   ├── payment_service.py    # Payment processing consumer
│   │   ├── notification_service.py # Email/SMS consumer
│   │   └── analytics_service.py  # Real-time analytics consumer
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AnalyticsDashboard.js  # Real-time analytics charts
│   │   │   ├── ServiceMonitorPage.js  # Microservice health monitor
│   │   │   ├── MetricsDashboard.js    # System metrics
│   │   │   ├── CreateOrderPage.js     # Order creation
│   │   │   ├── OrderTrackingPage.js   # Live order tracking
│   │   │   └── LoadTestPage.js        # Load testing harness
│   │   ├── hooks/
│   │   │   ├── useAnalytics.js        # Analytics data polling
│   │   │   ├── useMetrics.js          # Metrics polling
│   │   │   └── useWebSocketWithFallback.js
│   │   ├── components/               # GlassCard, StatTile, AuroraBackground, etc.
│   │   └── AppRedesigned.js          # Main app with tab navigation
│   └── package.json
├── docker-compose.yml                # Kafka + Zookeeper
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Framer Motion, Lucide Icons |
| **Backend** | FastAPI, Python 3.11, AsyncIO |
| **Messaging** | Apache Kafka (kafka-python-ng) |
| **Streaming** | Apache Spark (PySpark Structured Streaming) |
| **Infra** | Docker Compose (Zookeeper + Kafka) |
| **Real-time** | WebSockets |
| **UI Theme** | Neo-Aurora with Glassmorphism |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

**Made with 💫 by [Vasu Patel](https://github.com/Vasu2604)** — *Where orders meet elegance* 🚀
