import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Coins, AlertCircle } from 'lucide-react';
import { UserProfile } from '../../types';

interface SpinWheelProps {
  userProfile: UserProfile;
  showToast: (title: string, message: string) => void;
  updateBerries: (amount: number) => void;
}

export const SpinWheel: React.FC<SpinWheelProps> = ({ userProfile, showToast, updateBerries }) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<any>(null);

  const SPINS_COST = 10;
  const SEGMENTS = [
    { label: '50 Berry', value: 50, color: '#fca5a5' },
    { label: '100 Berry', value: 100, color: '#f87171' },
    { label: '2x Survey', value: '2x', color: '#fcd34d' },
    { label: 'Airtime ₦100', value: 'airtime', color: '#86efac' },
    { label: 'Try Again', value: 0, color: '#9ca3af' },
    { label: 'Try Again', value: 0, color: '#9ca3af' },
    { label: '200 Berry', value: 200, color: '#60a5fa' },
    { label: 'Jackpot', value: 1000, color: '#c084fc' }
  ];

  const handleSpin = () => {
    if (userProfile.berry < SPINS_COST) {
      showToast('Insufficient Berry', 'You need 10 Berry to spin.');
      return;
    }

    setSpinning(true);
    setResult(null);
    updateBerries(-SPINS_COST);

    // Calculate spin
    const targetSegmentIndex = Math.floor(Math.random() * SEGMENTS.length); // simple random for demo
    const segmentAngle = 360 / SEGMENTS.length;
    // Add 5 full rotations + the target angle
    // Segment 0 is at top. Segment 1 is right of it, etc.
    // To land on target index, we rotate so that target is at 0 deg.
    const targetRotation = 360 * 5 - (targetSegmentIndex * segmentAngle); 
    
    setRotation(prev => prev + targetRotation + (360 * 5) - (prev % 360) - (targetSegmentIndex * segmentAngle));

    setTimeout(() => {
      setSpinning(false);
      setResult(SEGMENTS[targetSegmentIndex]);
    }, 5000);
  };

  const handleClaim = () => {
    if (result) {
      if (typeof result.value === 'number' && result.value > 0) {
        updateBerries(result.value);
        showToast('Claimed', `You received ${result.value} Berry!`);
      } else {
        showToast('Claimed', `You redeemed: ${result.label}`);
      }
      setResult(null);
    }
  };

  const wheelBackground = `conic-gradient(from -${180 / SEGMENTS.length}deg, ${SEGMENTS.map(
    (s, i) => `${s.color} ${i * (360 / SEGMENTS.length)}deg ${(i + 1) * (360 / SEGMENTS.length)}deg`
  ).join(', ')})`;

  return (
    <div className="flex flex-col items-center bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
      <div className="mb-8 text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Spin & Win</h3>
        <p className="text-gray-500 text-sm flex items-center justify-center gap-1">
          Cost: <span className="font-semibold text-[#4c203b]">10</span> <Coins size={14} className="text-[#4c203b]" /> per spin
        </p>
      </div>

      <div className="relative w-64 h-64 mb-8">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-3 z-10 w-6 h-8 text-red-600 drop-shadow-md">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 21l-9-13h18l-9 13z" />
          </svg>
        </div>

        {/* Wheel */}
        <motion.div
          className="w-full h-full rounded-full border-[6px] border-[#1e293b] overflow-hidden relative shadow-lg"
          animate={{ rotate: rotation }}
          transition={{ duration: 5, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ background: wheelBackground }}
        >
          {SEGMENTS.map((seg, i) => {
            const angle = i * (360 / SEGMENTS.length);
            return (
              <div 
                key={i} 
                className="absolute top-[calc(50%-12px)] left-1/2 origin-left flex items-center justify-end pr-3 sm:pr-4 w-[48%] h-[24px]"
                style={{ transform: `rotate(${angle - 90}deg)` }}
              >
                <div 
                  className="font-bold text-white text-[11px] sm:text-xs tracking-wide whitespace-nowrap"
                  style={{ textShadow: "0px 1px 3px rgba(0,0,0,0.8)" }}
                >
                  {seg.label}
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      <button
        onClick={handleSpin}
        disabled={spinning}
        className="w-full max-w-[240px] bg-[#4c203b] text-white py-4 px-6 rounded-2xl font-bold text-lg hover:bg-[#3d192f] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(76,32,59,0.25)] active:scale-95"
      >
        {spinning ? 'SPINNING...' : 'SPIN NOW'}
      </button>

      {/* Result Card */}
      {result && !spinning && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8 p-8 bg-gray-50 border border-gray-100 rounded-[2rem] w-full text-center relative overflow-hidden"
        >
          <h4 className="font-bold text-xl text-gray-500 mb-2 drop-shadow-sm">{result.value === 0 ? "Oof!" : "You Won!"}</h4>
          <p className="text-[40px] font-bold text-[#4c203b] tracking-tight leading-tight mb-8 drop-shadow-sm">{result.label}</p>
          <button 
            onClick={handleClaim} 
            className="bg-[#111827] text-white px-10 py-4 rounded-[1.25rem] font-bold text-xl hover:bg-gray-800 transition-colors shadow-lg"
          >
            {result.value === 0 ? "Close" : "Claim"}
          </button>
        </motion.div>
      )}
    </div>
  );
};
