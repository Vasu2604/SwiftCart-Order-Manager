import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, TrendingUp, Activity, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Toaster } from 'sonner';
import AuroraBackground from './components/AuroraBackground';
import TopNav from './components/TopNav';
import StatTile from './components/StatTile';
import GlassCard from './components/GlassCard';
import LiveIndicator from './components/LiveIndicator';
import CreateOrderPage from './pages/CreateOrderPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import LoadTestPage from './pages/LoadTestPage';
import MetricsDashboard from './pages/MetricsDashboard';
import { useMetrics } from './hooks/useMetrics';
import { useWebSocketWithFallback } from './hooks/useWebSocketWithFallback';

function AppRedesigned() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { metrics, loading: metricsLoading, error: metricsError } = useMetrics(2000);
  const { status: wsStatus, lastMessage } = useWebSocketWithFallback(
    'ws://localhost:8001/api/ws/orders',
    { enabled: true, reconnectInterval: 3000 }
  );

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'create', label: 'Create Order', icon: Plus },
    { id: 'track', label: 'Track Orders', icon: Package },
    { id: 'loadtest', label: 'Load Test', icon: TrendingUp },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <MetricsDashboard metrics={metrics} loading={metricsLoading} error={metricsError} />;
      case 'create':
        return <CreateOrderPage />;
      case 'track':
        return <OrderTrackingPage />;
      case 'loadtest':
        return <LoadTestPage />;
      default:
        return <MetricsDashboard metrics={metrics} loading={metricsLoading} error={metricsError} />;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AuroraBackground />

      <div className="relative z-10">
        <TopNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tabs={tabs}
        />

        <main className="container mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
}

export default AppRedesigned;
