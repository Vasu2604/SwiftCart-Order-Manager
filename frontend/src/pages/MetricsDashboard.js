import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, Package, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import StatTile from '../components/StatTile';
import GlassCard from '../components/GlassCard';
import LiveIndicator from '../components/LiveIndicator';

const MetricsDashboard = ({ metrics, loading, error }) => {
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const formatTime = (ms) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (error) {
    return (
      <GlassCard className="text-center py-12">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400">Failed to load metrics: {error}</p>
        <p className="text-gray-400 mt-2">Please check if the backend is running.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <motion.div 
        className="text-center space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold aurora-gradient-text">
          SwiftCart Order Manager
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Real-time order processing and metrics dashboard with Neo-Aurora design
        </p>
        <LiveIndicator status="connected" />
      </motion.div>

      {/* Key Metrics */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <StatTile
          label="Total Orders"
          value={metrics.total_orders}
          icon={Package}
          color="violet"
          loading={loading}
        />
        <StatTile
          label="Avg Latency"
          value={metrics.avg_processing_time_ms}
          unit="ms"
          icon={Clock}
          color="fuchsia"
          loading={loading}
        />
        <StatTile
          label="Queue Depth"
          value={metrics.queue_depth}
          icon={Activity}
          color="emerald"
          loading={loading}
        />
        <StatTile
          label="Success Rate"
          value={metrics.total_orders > 0 ? ((metrics.completed_orders / metrics.total_orders) * 100).toFixed(1) : 0}
          unit="%"
          icon={CheckCircle}
          color="blue"
          trend={5}
          loading={loading}
        />
      </motion.div>

      {/* Detailed Metrics */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            <span>Performance Metrics</span>
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Throughput</span>
              <span className="text-white font-mono">
                {formatNumber(metrics.throughput_per_sec)} ops/sec
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">P95 Latency</span>
              <span className="text-white font-mono">
                {formatTime(metrics.p95_latency_ms)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">P99 Latency</span>
              <span className="text-white font-mono">
                {formatTime(metrics.p99_latency_ms)}
              </span>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>Order Status</span>
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Completed</span>
              <span className="text-green-400 font-mono">
                {formatNumber(metrics.completed_orders)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Failed</span>
              <span className="text-red-400 font-mono">
                {formatNumber(metrics.failed_orders)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Success Rate</span>
              <span className="text-emerald-400 font-mono">
                {metrics.total_orders > 0 ? ((metrics.completed_orders / metrics.total_orders) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default MetricsDashboard;
