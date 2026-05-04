import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import logo2Img from '../assets/logo2.png';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="absolute inset-0 bg-[#4A1D3D] z-[100] overflow-hidden flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div 
          key="logo"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <div className="w-32 h-32 mb-4 flex items-center justify-center">
            <img 
              src={logo2Img} 
              alt="berry Logo" 
              className="w-full h-full object-contain drop-shadow-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
            className="text-5xl font-black text-white tracking-tighter"
          >
            berry
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="text-white/70 text-xs mt-3 font-semibold tracking-widest uppercase"
          >
            by Rivabit
          </motion.p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
