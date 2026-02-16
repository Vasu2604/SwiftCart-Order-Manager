import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Server, Wifi, WifiOff, Activity, CheckCircle, XCircle,
    AlertTriangle, ArrowRight, Package, CreditCard, Bell, BarChart3, RefreshCw,
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import axios from 'axios';

const ServiceMonitorPage = () => {
    const [health, setHealth] = useState(null);
    const [, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);

    const fetchHealth = useCallback(async () => {
        try {
            const response = await axios.get('/api/services/health');
            setHealth(response.data);
            setError(null);
            setLastRefresh(new Date());
        } catch (err) {
            setError(err.message || 'Failed to fetch service health');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 5000);
        return () => clearInterval(interval);
    }, [fetchHealth]);

    const serviceIcons = {
        inventory: Package,
        payment: CreditCard,
        notification: Bell,
        analytics: BarChart3,
    };

    const serviceColors = {
        inventory: { gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-400/10', text: 'text-blue-400', border: 'border-blue-400/20' },
        payment: { gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-400/10', text: 'text-emerald-400', border: 'border-emerald-400/20' },
        notification: { gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-400/10', text: 'text-amber-400', border: 'border-amber-400/20' },
        analytics: { gradient: 'from-violet-500 to-fuchsia-500', bg: 'bg-violet-400/10', text: 'text-violet-400', border: 'border-violet-400/20' },
    };

    const getStatusBadge = (status) => {
        const styles = {
            running: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Running' },
            fallback: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Fallback' },
            stopped: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Stopped' },
            starting: { icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Starting' },
        };
        const s = styles[status] || styles.stopped;
        const Icon = s.icon;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.color} ${s.bg}`}>
                <Icon className="w-3 h-3" />
                {s.label}
            </span>
        );
    };

    if (error && !health) {
        return (
            <GlassCard className="text-center py-12">
                <WifiOff className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-400">Services unavailable: {error}</p>
                <p className="text-gray-400 mt-2">Check if the backend is running.</p>
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
                    <Server className="w-8 h-8 text-violet-400" />
                    Service Monitor
                </h1>
                <p className="text-gray-300">
                    Kafka-powered microservice event pipeline status
                </p>
                {lastRefresh && (
                    <p className="text-xs text-gray-500">
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </p>
                )}
            </motion.div>

            {/* Kafka Broker Status */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${health?.kafka?.connected
                                ? 'bg-emerald-400/10 border border-emerald-400/20'
                                : 'bg-amber-400/10 border border-amber-400/20'
                                }`}>
                                {health?.kafka?.connected
                                    ? <Wifi className="w-6 h-6 text-emerald-400" />
                                    : <WifiOff className="w-6 h-6 text-amber-400" />
                                }
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Apache Kafka Broker</h3>
                                <p className="text-sm text-gray-400 font-mono">
                                    {health?.kafka?.broker || 'localhost:9092'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            {health?.kafka?.connected ? (
                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400/10 text-emerald-400 text-sm font-medium">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    Connected
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/10 text-amber-400 text-sm font-medium">
                                    <AlertTriangle className="w-4 h-4" />
                                    Fallback Mode
                                </span>
                            )}
                        </div>
                    </div>
                    {!health?.kafka?.connected && (
                        <div className="mt-4 p-3 rounded-lg bg-amber-400/5 border border-amber-400/10">
                            <p className="text-xs text-amber-300/80">
                                Kafka broker is not connected. Services are running in fallback mode — all features still work.
                                To enable Kafka: <code className="text-amber-300">docker-compose up -d</code>
                            </p>
                        </div>
                    )}
                </GlassCard>
            </motion.div>

            {/* Consumer Services Grid */}
            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                {health?.services && Object.entries(health.services).map(([name, service], i) => {
                    const Icon = serviceIcons[name] || Server;
                    const colors = serviceColors[name] || serviceColors.analytics;

                    return (
                        <motion.div
                            key={name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + i * 0.1 }}
                        >
                            <GlassCard className={`border ${colors.border}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg}`}>
                                            <Icon className={`w-5 h-5 ${colors.text}`} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold capitalize">{name} Service</h4>
                                            <p className="text-xs text-gray-500 font-mono">{service.service}</p>
                                        </div>
                                    </div>
                                    {getStatusBadge(service.status)}
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="text-center p-2 rounded-lg bg-white/5">
                                        <p className="text-lg font-bold text-white">{service.processed_count}</p>
                                        <p className="text-xs text-gray-500">Processed</p>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-white/5">
                                        <p className="text-lg font-bold text-emerald-400">{service.success_count}</p>
                                        <p className="text-xs text-gray-500">Success</p>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-white/5">
                                        <p className="text-lg font-bold text-red-400">{service.failure_count}</p>
                                        <p className="text-xs text-gray-500">Failed</p>
                                    </div>
                                </div>

                                {/* Success Rate Bar */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">Success Rate</span>
                                        <span className={colors.text}>{service.success_rate?.toFixed(1) || 0}%</span>
                                    </div>
                                    <div className="w-full bg-white/5 rounded-full h-1.5">
                                        <motion.div
                                            className={`h-full rounded-full bg-gradient-to-r ${colors.gradient}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(service.success_rate || 0, 100)}%` }}
                                            transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                                        />
                                    </div>
                                </div>

                                {service.last_heartbeat && (
                                    <p className="text-xs text-gray-600 mt-3">
                                        Last heartbeat: {new Date(service.last_heartbeat).toLocaleTimeString()}
                                    </p>
                                )}
                            </GlassCard>
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* Event Pipeline Visualization */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
            >
                <GlassCard>
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-fuchsia-400" />
                        Event Pipeline Architecture
                    </h3>

                    {/* Pipeline Flow */}
                    <div className="flex flex-col items-center gap-4 py-4">
                        {/* Source */}
                        <div className="flex items-center gap-4 w-full max-w-2xl">
                            <div className="flex-1 text-center">
                                <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30">
                                    <Server className="w-5 h-5 text-violet-400" />
                                    <span className="font-semibold text-sm">FastAPI Order Service</span>
                                </div>
                            </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex flex-col items-center gap-1">
                            <motion.div
                                className="w-0.5 h-6 bg-gradient-to-b from-violet-500 to-orange-500"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                            <span className="text-xs text-gray-500">publish event</span>
                        </div>

                        {/* Kafka */}
                        <div className="w-full max-w-2xl">
                            <div className="text-center px-8 py-4 rounded-xl bg-gradient-to-r from-orange-600/10 to-amber-600/10 border border-orange-500/20">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <span className="text-orange-400 font-bold text-sm">Apache Kafka</span>
                                    {health?.kafka?.connected && (
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    )}
                                </div>
                                <span className="text-xs text-gray-500 font-mono">Topic: orders</span>
                            </div>
                        </div>

                        {/* Fan-out arrows */}
                        <div className="flex items-center justify-center gap-8 w-full max-w-3xl mt-1">
                            {['inventory', 'payment', 'notification', 'analytics'].map((name, i) => (
                                <motion.div
                                    key={name}
                                    className="flex flex-col items-center gap-1"
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                                >
                                    <div className="w-0.5 h-4 bg-gradient-to-b from-orange-500 to-transparent" />
                                    <ArrowRight className="w-3 h-3 text-gray-600 rotate-90" />
                                </motion.div>
                            ))}
                        </div>

                        {/* Consumers */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl">
                            {['inventory', 'payment', 'notification', 'analytics'].map((name) => {
                                const Icon = serviceIcons[name];
                                const colors = serviceColors[name];
                                const service = health?.services?.[name];
                                return (
                                    <div
                                        key={name}
                                        className={`text-center p-3 rounded-lg ${colors.bg} border ${colors.border}`}
                                    >
                                        <Icon className={`w-4 h-4 mx-auto mb-1 ${colors.text}`} />
                                        <p className="text-xs font-medium capitalize">{name}</p>
                                        <p className="text-xs text-gray-500">{service?.processed_count || 0} events</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </GlassCard>
            </motion.div>
        </div>
    );
};

export default ServiceMonitorPage;
