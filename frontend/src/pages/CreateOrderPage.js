import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, ShoppingCart } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import axios from 'axios';
import { toast } from 'sonner';

const CreateOrderPage = () => {
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState([{
    product_id: '',
    name: '',
    quantity: 1,
    price: 0
  }]);
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    setItems([...items, {
      product_id: '',
      name: '',
      quantity: 1,
      price: 0
    }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + (item.quantity * item.price), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const orderData = {
        customer_id: customerId || `CUST-${Date.now()}`,
        customer_name: customerName,
        items: items.filter(item => item.name && item.product_id)
      };

      const response = await axios.post('/api/orders', orderData);
      toast.success(`Order ${response.data.order_id} created successfully!`);
      
      // Reset form
      setCustomerId('');
      setCustomerName('');
      setItems([{ product_id: '', name: '', quantity: 1, price: 0 }]);
    } catch (error) {
      toast.error('Failed to create order: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
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
        <h1 className="text-3xl font-bold aurora-gradient-text">Create New Order</h1>
        <p className="text-gray-300">Submit a new order for processing</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Customer ID (Auto-generated if empty)</label>
              <input
                type="text"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="CUST-12345"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="John Doe"
              />
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Order Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center space-x-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <motion.div
                key={index}
                className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-white/5 rounded-lg"
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <input
                  type="text"
                  placeholder="Product ID"
                  value={item.product_id}
                  onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <input
                  type="text"
                  placeholder="Product Name"
                  value={item.name}
                  onChange={(e) => updateItem(index, 'name', e.target.value)}
                  required
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <input
                  type="number"
                  placeholder="Quantity"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <input
                  type="number"
                  placeholder="Price"
                  min="0"
                  step="0.01"
                  value={item.price}
                  onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  className="p-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-violet-600/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-2xl font-bold aurora-gradient-text">
                ${calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>
        </GlassCard>

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={loading || !customerName || items.some(item => !item.name)}
            className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:from-gray-600 disabled:to-gray-600 rounded-lg font-semibold transition-all duration-200 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>{loading ? 'Creating Order...' : 'Create Order'}</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default CreateOrderPage;
