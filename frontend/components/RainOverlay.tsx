'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function WateringOverlay({ show }) {
  const messages = [
    'Growing your tree...',
    'Finding related branches...',
    'Gaining sunshine and happiness...',
    'Absorbing nutrients...',
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!show) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="rain-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center select-none overflow-hidden bg-transparent"
        >
          {/* Heavy, fast rain layer */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(250)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-[1px] h-8 bg-blue-400/80 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: 0.7 + Math.random() * 0.3,
                }}
                initial={{ y: -20, opacity: 0 }}
                animate={{
                  y: ['-10%', '110%'],
                  opacity: [0.8, 1, 0],
                }}
                transition={{
                  duration: 0.6 + Math.random() * 0.4, // Faster fall
                  repeat: Infinity,
                  delay: Math.random() * 0.6,
                  ease: 'linear',
                }}
              />
            ))}
          </div>

          {/* Status message */}
          <AnimatePresence mode="wait">
            <motion.p
              key={messages[index]}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.4 }}
              className="text-green-800 mt-4 text-lg font-medium bg-white/70 px-3 py-1 rounded-md backdrop-blur-sm drop-shadow-sm"
            >
              {messages[index]}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

