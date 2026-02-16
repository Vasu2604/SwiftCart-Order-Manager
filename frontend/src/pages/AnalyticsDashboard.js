import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingUp, AlertTriangle, ShoppingBag, Globe, Zap, DollarSign, Package } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import StatTile from '../components/StatTile';
import { useAnalytics } from '../hooks/useAnalytics';

const AnalyticsDashboard = () => {
    const {
        summary,
        opmHistory,
        topProducts,
        revenueByRegion,
        anomalies,
        loading,
        error,
    } = useAnalytics(3000);

    const formatCurrency = (val) => {
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
        return `$${val.toFixed(2)}`;
    };

    const regionColors = [
        'from-violet-500 to-fuchsia-500',
        'from-blue-500 to-cyan-500',
        'from-emerald-500 to-teal-500',
        'from-amber-500 to-orange-500',
        'from-rose-500 to-pink-500',
    ];

    const severityStyles = {
        info: 'border-blue-400/30 bg-blue-400/10 text-blue-300',
        warning: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
        critical: 'border-red-400/30 bg-red-400/10 text-red-300',
    };

    if (error) {
        return (
            <GlassCard className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <p className="text-amber-400">Analytics unavailable: {error}</p>
                <p className="text-gray-400 mt-2">Make sure the backend is running.</p>
            </GlassCard>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <motion.div
                className="text-center space-y-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-3xl font-bold aurora-gradient-text flex items-center justify-center gap-3">
                    <Zap className="w-8 h-8 text-amber-400" />
                    Real-Time Analytics
                </h1>
                <p className="text-gray-300">
                    Powered by Apache Kafka &amp; Apache Spark Structured Streaming
                </p>
            </motion.div>

            {/* Key Metrics */}
            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <StatTile
                    label="Orders / Min"
                    value={summary.orders_per_minute}
                    icon={TrendingUp}
                    color="emerald"
                    loading={loading}
                />
                <StatTile
                    label="Avg Order Value"
                    value={summary.average_order_value}
                    unit="$"
                    icon={DollarSign}
                    color="violet"
                    loading={loading}
                />
                <StatTile
                    label="Total Revenue"
                    value={summary.total_revenue}
                    unit="$"
                    icon={BarChart3}
                    color="fuchsia"
                    loading={loading}
                />
                <StatTile
                    label="Anomalies"
                    value={summary.anomaly_count}
                    icon={AlertTriangle}
                    color="amber"
                    loading={loading}
                />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Orders Per Minute Chart */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <GlassCard>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                            Orders Per Minute
                        </h3>
                        <div className="space-y-2">
                            {opmHistory.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-8">
                                    Waiting for order data...
                                </p>
                            ) : (
                                <div className="flex items-end gap-1 h-40">
                                    {opmHistory.slice(-20).map((point, i) => {
                                        const maxVal = Math.max(...opmHistory.slice(-20).map(p => p.value), 1);
                                        const height = Math.max((point.value / maxVal) * 100, 4);
                                        return (
                                            <motion.div
                                                key={i}
                                                className="flex-1 rounded-t-sm bg-gradient-to-t from-emerald-600 to-emerald-400 relative group cursor-pointer"
                                                style={{ height: `${height}%` }}
                                                initial={{ height: 0 }}
                                                animate={{ height: `${height}%` }}
                                                transition={{ duration: 0.3, delay: i * 0.02 }}
                                            >
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                    {point.value}/min
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                                <span>Oldest</span>
                                <span>Current: {summary.orders_per_minute}/min</span>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>

                {/* Top Products */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <GlassCard>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-violet-400" />
                            Top Products (Last 5 Min)
                        </h3>
                        <div className="space-y-3">
                            {topProducts.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-8">
                                    No product data yet...
                                </p>
                            ) : (
                                <AnimatePresence>
                                    {topProducts.slice(0, 6).map((product, i) => {
                                        const maxQty = Math.max(...topProducts.map(p => p.quantity_last_5min), 1);
                                        const pct = (product.quantity_last_5min / maxQty) * 100;
                                        return (
                                            <motion.div
                                                key={product.product_id}
                                                className="space-y-1"
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                            >
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-300 truncate mr-2">
                                                        <span className="text-violet-400 font-mono text-xs mr-2">#{i + 1}</span>
                                                        {product.name}
                                                    </span>
                                                    <span className="text-white font-mono whitespace-nowrap">
                                                        {product.quantity_last_5min} units
                                                    </span>
                                                </div>
                                                <div className="w-full bg-white/5 rounded-full h-1.5">
                                                    <motion.div
                                                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ duration: 0.5, delay: i * 0.05 }}
                                                    />
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            )}
                        </div>
                    </GlassCard>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue by Region */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    <GlassCard>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-blue-400" />
                            Revenue by Region
                        </h3>
                        <div className="space-y-4">
                            {revenueByRegion.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-8">
                                    No regional data yet...
                                </p>
                            ) : (
                                revenueByRegion.map((region, i) => (
                                    <motion.div
                                        key={region.region}
                                        className="space-y-2"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: i * 0.08 }}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300 text-sm">{region.region}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-mono text-sm">
                                                    {formatCurrency(region.revenue)}
                                                </span>
                                                <span className="text-gray-500 text-xs">
                                                    ({region.percentage}%)
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-white/5 rounded-full h-2">
                                            <motion.div
                                                className={`h-full rounded-full bg-gradient-to-r ${regionColors[i % regionColors.length]}`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${region.percentage}%` }}
                                                transition={{ duration: 0.6, delay: i * 0.08 }}
                                            />
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </motion.div>

                {/* Anomaly Detection */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    <GlassCard>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                            Anomaly Detection
                        </h3>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                            {anomalies.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-3">
                                        <Package className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <p className="text-emerald-400 text-sm font-medium">All Clear</p>
                                    <p className="text-gray-500 text-xs mt-1">No anomalies detected</p>
                                </div>
                            ) : (
                                <AnimatePresence>
                                    {anomalies.slice(-8).reverse().map((anomaly, i) => (
                                        <motion.div
                                            key={`${anomaly.type}-${anomaly.timestamp}-${i}`}
                                            className={`p-3 rounded-lg border ${severityStyles[anomaly.severity] || severityStyles.info}`}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                        >
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium capitalize">
                                                        {anomaly.type.replace(/_/g, ' ')}
                                                    </p>
                                                    <p className="text-xs opacity-80 mt-0.5">{anomaly.detail}</p>
                                                    {anomaly.timestamp && (
                                                        <p className="text-xs opacity-50 mt-1">
                                                            {new Date(anomaly.timestamp).toLocaleTimeString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>
                    </GlassCard>
                </motion.div>
            </div>

            {/* Kafka + Spark Badge */}
            <motion.div
                className="text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
            >
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                    <span className="text-xs text-gray-500">Powered by</span>
                    <span className="text-xs font-semibold text-orange-400">Apache Kafka</span>
                    <span className="text-xs text-gray-600">×</span>
                    <span className="text-xs font-semibold text-amber-400">Apache Spark</span>
                </div>
            </motion.div>
        </div>
    );
};

export default AnalyticsDashboard;
