import React from 'react';
import { motion } from 'framer-motion';

const LiveIndicator = ({ status = 'connected', label = 'Live' }) => {
  const statusConfig = {
    connected: { color: 'bg-green-400', text: 'Connected' },
    connecting: { color: 'bg-yellow-400', text: 'Connecting...' },
    disconnected: { color: 'bg-red-400', text: 'Disconnected' },
  };

  const config = statusConfig[status] || statusConfig.disconnected;

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        {status === 'connected' && (
          <motion.div
            className="absolute inset-0 w-2 h-2 rounded-full bg-green-400"
            animate={{
              opacity: [1, 0.5, 1],
              scale: [1, 2, 2],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </div>
      <span className="text-sm text-gray-300">{label}</span>
      <span className={`text-sm ${status === 'connected' ? 'text-green-400' : status === 'connecting' ? 'text-yellow-400' : 'text-red-400'}`}>
        {config.text}
      </span>
    </div>
  );
};

export default LiveIndicator;
