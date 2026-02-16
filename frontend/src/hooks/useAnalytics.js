import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useAnalytics = (intervalMs = 3000) => {
    const [summary, setSummary] = useState({
        orders_per_minute: 0,
        average_order_value: 0,
        total_revenue: 0,
        total_orders_analyzed: 0,
        active_regions: 0,
        unique_products: 0,
        anomaly_count: 0,
    });
    const [opmHistory, setOpmHistory] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [revenueByRegion, setRevenueByRegion] = useState([]);
    const [anomalies, setAnomalies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAnalytics = useCallback(async () => {
        try {
            const [summaryRes, opmRes, productsRes, regionRes, anomalyRes] = await Promise.all([
                axios.get('/api/analytics/summary'),
                axios.get('/api/analytics/orders-per-minute'),
                axios.get('/api/analytics/top-products?limit=10'),
                axios.get('/api/analytics/revenue-by-region'),
                axios.get('/api/analytics/anomalies?limit=20'),
            ]);

            setSummary(summaryRes.data);
            setOpmHistory(opmRes.data);
            setTopProducts(productsRes.data);
            setRevenueByRegion(regionRes.data);
            setAnomalies(anomalyRes.data);
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to fetch analytics');
            console.error('Analytics fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, intervalMs);
        return () => clearInterval(interval);
    }, [fetchAnalytics, intervalMs]);

    return {
        summary,
        opmHistory,
        topProducts,
        revenueByRegion,
        anomalies,
        loading,
        error,
        refetch: fetchAnalytics,
    };
};
