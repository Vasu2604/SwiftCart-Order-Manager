import React from 'react';
import { motion } from 'framer-motion';

const GlassCard = ({ children, hover = true, noPadding = false, className = '', ...props }) => {
  return (
    <motion.div
      className={`glass-card ${!noPadding && 'p-6'} ${hover ? 'cursor-pointer' : ''} ${className}`}
      whileHover={hover ? { y: -4 } : {}}
      whileTap={hover ? { scale: 0.98 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
