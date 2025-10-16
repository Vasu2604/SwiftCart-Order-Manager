import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, TrendingUp, Activity, Clock, CheckCircle, XCircle } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import axios from 'axios';
import { toast } from 'sonner';

const LoadTestPage = () => {
  const [config, setConfig] = useState({
    num_orders: 100,
    concurrent_requests: 10
  });
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: parseInt(value) || 0 }));
  };

  const runLoadTest = async () => {
    setRunning(true);
    setResults(null);
    
    try {
      const response = await axios.post('/api/load-test', config);
      setResults(response.data);
      toast.success(`Load test completed! ${response.data.successful} orders successful`);
    } catch (error) {
      toast.error('Load test failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setRunning(false);
    }
  };

  return (
    <motion.div 
      className="max-w-4xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold aurora-gradient-text">Load Testing</h1>
        <p className="text-gray-300">Test system performance with concurrent order submissions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-violet-400" />
            <span>Test Configuration</span>
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Number of Orders</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={config.num_orders}
                onChange={(e) => handleConfigChange('num_orders', e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Concurrent Requests</label>
              <input
                type="number"
                min="1"
                max="50"
                value={config.concurrent_requests}
                onChange={(e) => handleConfigChange('concurrent_requests', e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-violet-600/20 rounded-lg">
            <h3 className="font-medium mb-2">Test Details:</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• {config.num_orders} orders will be submitted</li>
              <li>• {config.concurrent_requests} concurrent requests</li>
              <li>• Random product selections</li>
              <li>• Idempotency enabled</li>
            </ul>
          </div>

          <button
            onClick={runLoadTest}
            disabled={running || config.num_orders < 1 || config.concurrent_requests < 1}
            className="w-full mt-6 flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-violet-600 hover:from-emerald-700 hover:to-violet-700 disabled:from-gray-600 disabled:to-gray-600 rounded-lg font-semibold transition-all duration-200 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" />
            <span>{running ? 'Running Test...' : 'Start Load Test'}</span>
          </button>
        </GlassCard>

        {results && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard>
              <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>Results</span>
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-gray-400">Successful</span>
                  </div>
                  <p className="text-2xl font-bold text-green-400">{results.successful}</p>
                </div>

                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="text-sm text-gray-400">Failed</span>
                  </div>
                  <p className="text-2xl font-bold text-red-400">{results.failed}</p>
                </div>

                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-gray-400">Avg Latency</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{results.avg_latency_ms.toFixed(0)}ms</p>
                </div>

                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Activity className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-gray-400">Throughput</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-400">{results.throughput_per_sec.toFixed(1)}/sec</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Time:</span>
                  <span className="text-white">{results.total_time_sec.toFixed(2)}s</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Success Rate:</span>
                  <span className="text-emerald-400">
                    {((results.successful / results.total_orders) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default LoadTestPage;
