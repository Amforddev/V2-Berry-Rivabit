import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { UserProfile } from '../../types';

interface PredictionsProps {
  userProfile: UserProfile;
  showToast: (title: string, message: string) => void;
  updateBerries: (amount: number) => void;
}

export const Predictions: React.FC<PredictionsProps> = ({ userProfile, showToast, updateBerries }) => {
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null);
  const [stakeAmount, setStakeAmount] = useState(50);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Mock data for predictions
  const predictions = [
    {
      id: 'p1',
      question: 'Who will win the UEFA Champions League 2026?',
      totalStaked: 145000,
      closeDate: 'May 30, 2026',
      options: [
        { id: 'o1', label: 'Real Madrid', staked: 75000 },
        { id: 'o2', label: 'Man City', staked: 45000 },
        { id: 'o3', label: 'Arsenal', staked: 25000 }
      ]
    },
    {
      id: 'p2',
      question: 'Will Bitcoin reach $150k by end of June?',
      totalStaked: 82000,
      closeDate: 'Jun 30, 2026',
      options: [
        { id: 'o1', label: 'Yes', staked: 60000 },
        { id: 'o2', label: 'No', staked: 22000 }
      ]
    }
  ];

  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStakeAmount(Number(e.target.value));
  };

  const handlePlaceBet = () => {
    if (!selectedOption) return;
    if (userProfile.berry < stakeAmount) {
      showToast('Error', 'Insufficient Berry balance.');
      return;
    }
    
    updateBerries(-stakeAmount);
    showToast('Bet Placed!', `You wagered ${stakeAmount} Berry on this outcome.`);
    setSelectedPrediction(null);
    setSelectedOption(null);
    setStakeAmount(50);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 text-white mb-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={24} />
          <h3 className="text-xl font-bold">Prediction Market</h3>
        </div>
        <p className="text-blue-100 text-sm">Bet on real-world events. The odds are determined by the community pool.</p>
      </div>

      {predictions.map(pred => (
        <div key={pred.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
          <div className="flex justify-between items-start gap-3">
             <h4 className="font-bold text-lg text-gray-900 leading-tight flex-1">{pred.question}</h4>
             <div className="bg-gray-50 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-500 border border-gray-200 flex items-center gap-1 shrink-0">
               <TrendingUp size={12} /> {(pred.totalStaked / 1000).toFixed(1)}k Pool
             </div>
          </div>
          
          <div className="flex items-center gap-1 text-xs font-medium text-gray-400">
            <Clock size={12} /> Closes {pred.closeDate}
          </div>

          <div className="space-y-2 mt-2">
            {pred.options.map(opt => {
              const odds = pred.totalStaked / opt.staked;
               return (
                 <button 
                   key={opt.id}
                   onClick={() => {
                     setSelectedPrediction(pred);
                     setSelectedOption(opt.id);
                   }}
                   className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                 >
                   <span className="font-medium text-gray-700 group-hover:text-blue-700">{opt.label}</span>
                   <span className="font-bold text-gray-900 group-hover:text-blue-800">{odds.toFixed(2)}x</span>
                 </button>
               )
            })}
          </div>
        </div>
      ))}

      {/* Bet Modal */}
      <AnimatePresence>
        {selectedPrediction && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div 
               initial={{ y: '100%' }}
               animate={{ y: 0 }}
               exit={{ y: '100%' }}
               className="bg-white w-full sm:w-[380px] rounded-t-3xl sm:rounded-3xl p-6 pb-safe"
            >
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <h3 className="text-sm font-semibold text-gray-500 mb-1">Place Prediction</h3>
                   <p className="font-bold text-gray-900 line-clamp-2">{selectedPrediction.question}</p>
                 </div>
                 <button onClick={() => setSelectedPrediction(null)} className="p-2 bg-gray-100 rounded-full text-gray-500">
                   <AlertCircle size={16} /> {/* mock close icon */}
                 </button>
               </div>

               <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                 <p className="text-sm text-blue-800 font-medium mb-1">Your Pick:</p>
                 <p className="text-xl font-bold text-blue-900">
                   {selectedPrediction.options.find((o: any) => o.id === selectedOption)?.label}
                 </p>
                 {(() => {
                    const opt = selectedPrediction.options.find((o: any) => o.id === selectedOption);
                    const odds = selectedPrediction.totalStaked / opt.staked;
                    return (
                      <p className="text-sm mt-1 text-blue-700">Multiplier: <span className="font-bold">{odds.toFixed(2)}x</span></p>
                    )
                 })()}
               </div>

               <div className="mb-6">
                 <label className="block text-sm font-semibold text-gray-700 mb-2">Wager Amount (Berry)</label>
                 <input 
                   type="number" 
                   value={stakeAmount}
                   onChange={handleStakeChange}
                   className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                   min={10}
                 />
                 {(() => {
                    const opt = selectedPrediction.options.find((o: any) => o.id === selectedOption);
                    const odds = selectedPrediction.totalStaked / opt.staked;
                    return (
                      <div className="flex justify-between items-center mt-3 text-sm">
                        <span className="text-gray-500">Potential Return:</span>
                        <span className="font-bold text-[#00A082]">+{(stakeAmount * odds).toFixed(0)} Berry</span>
                      </div>
                    )
                 })()}
               </div>

               <button 
                 onClick={handlePlaceBet}
                 className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors"
               >
                 Confirm Prediction
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
