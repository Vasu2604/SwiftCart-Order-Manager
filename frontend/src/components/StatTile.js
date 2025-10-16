import React from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatTile = ({ label, value, unit, icon: Icon, color = 'violet', trend, loading = false }) => {
  const spring = useSpring(value || 0, { stiffness: 100, damping: 20 });

  const colorClasses = {
    violet: 'from-violet-500 to-purple-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
    emerald: 'from-emerald-500 to-green-600',
    blue: 'from-blue-500 to-cyan-600',
  };

  const bgColorClass = colorClasses[color] || colorClasses.violet;

  if (loading) {
    return (
      <div className="glass-card animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-700 rounded-lg"></div>
            <div>
              <div className="h-4 bg-gray-700 rounded w-20 mb-2"></div>
              <div className="h-6 bg-gray-700 rounded w-16"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="glass-card group cursor-pointer relative overflow-hidden"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Shimmer effect */}
      <div className={`absolute inset-0 bg-gradient-to-r ${bgColorClass} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

      {/* Top border shimmer */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${bgColorClass} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${bgColorClass} rounded-lg flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-wide">{label}</p>
            <motion.p
              className="text-2xl font-bold text-white"
            >
              {Math.round(spring.get())}
              {unit && <span className="text-sm text-gray-400 ml-1">{unit}</span>}
            </motion.p>
          </div>
        </div>

        {trend !== undefined && (
          <div className={`flex items-center space-x-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {Math.abs(trend)}%
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StatTile;
