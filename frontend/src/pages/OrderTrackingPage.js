import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import axios from 'axios';

const OrderTrackingPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/orders?limit=20');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => 
    order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'processing': return <Clock className="w-4 h-4 text-yellow-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-400/20';
      case 'failed': return 'text-red-400 bg-red-400/20';
      case 'processing': return 'text-yellow-400 bg-yellow-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <GlassCard key={i} className="animate-pulse">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-4 bg-gray-700 rounded w-32"></div>
                <div className="h-3 bg-gray-700 rounded w-24"></div>
              </div>
              <div className="h-6 bg-gray-700 rounded w-20"></div>
            </div>
          </GlassCard>
        ))}
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold aurora-gradient-text">Order Tracking</h1>
          <p className="text-gray-300">Monitor order status and processing</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 w-64"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No orders found</p>
          <p className="text-sm text-gray-500 mt-1">Orders will appear here once created</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredOrders.map((order, index) => (
              <motion.div
                key={order.order_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <GlassCard>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-mono text-violet-400">{order.order_id}</span>
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="capitalize">{order.status}</span>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-400 space-y-1">
                        <p><span className="text-gray-300">Customer:</span> {order.customer_name}</p>
                        <p><span className="text-gray-300">Items:</span> {order.items.length}</p>
                        <p><span className="text-gray-300">Total:</span> ${order.total.toFixed(2)}</p>
                        {order.processing_time_ms && (
                          <p><span className="text-gray-300">Processing Time:</span> {order.processing_time_ms.toFixed(0)}ms</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Created</p>
                      <p className="text-sm text-white">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default OrderTrackingPage;
