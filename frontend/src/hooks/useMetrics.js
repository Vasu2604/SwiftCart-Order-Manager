import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useMetrics = (intervalMs = 2000) => {
  const [metrics, setMetrics] = useState({
    total_orders: 0,
    completed_orders: 0,
    failed_orders: 0,
    avg_processing_time_ms: 0,
    queue_depth: 0,
    throughput_per_sec: 0,
    p95_latency_ms: 0,
    p99_latency_ms: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await axios.get('/api/metrics');
      setMetrics(response.data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch metrics');
      console.error('Metrics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    
    const interval = setInterval(fetchMetrics, intervalMs);
    
    return () => clearInterval(interval);
  }, [fetchMetrics, intervalMs]);

  return { metrics, loading, error, refetch: fetchMetrics };
};
