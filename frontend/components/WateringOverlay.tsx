'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function WateringOverlay({ show }: { show: boolean }) {
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
    }, 2500); // 2.5s per message
    return () => clearInterval(interval);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="watering"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center select-none"
        >
          <div className="flex flex-col items-center relative">
            <motion.div
              className="relative left-[-3px]"
              initial={{ rotate: -20 }}
              animate={{ rotate: [-20, -10, -25, -10, -20] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#166534"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-16 h-16 mb-2"
              >
                <path d="M18 10V3h-3v7a3 3 0 0 1-6 0V3H6v7c0 3.31 2.69 6 6 6s6-2.69 6-6Z" />
                <path d="M22 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <line x1="2" y1="19" x2="22" y2="19" />
              </svg>
            </motion.div>

            <div className="relative h-40 w-24 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-4 bg-blue-400/80 rounded-full"
                  style={{
                    left: `${40 + i * 4}%`,
                    transform: 'translateX(-50%)',
                  }}
                  initial={{ y: -5, opacity: 0 }}
                  animate={{ y: [0, 35, 300], opacity: [0, 1, 0] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.25,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={messages[index]}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.5 }}
              className="text-green-800 mt-4 text-lg font-medium"
            >
              {messages[index]}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
