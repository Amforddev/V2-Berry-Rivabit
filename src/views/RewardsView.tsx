import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, CheckCircle2, Ticket, AlertCircle, Share2, Users } from 'lucide-react';
import * as Icons from 'lucide-react';
import { RewardOption, UserProfile, Redemption } from '../types';
import { REWARD_CATEGORIES } from '../data';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

const MOVED_GAME_IDS = ['raffle', 'scratch', 'wheel', 'predict'];
const FILTERED_CATEGORIES = REWARD_CATEGORIES.filter(c => !MOVED_GAME_IDS.includes(c.id));

interface RewardsViewProps {
  userProfile: UserProfile;
  redeemReward: (opt: RewardOption, details?: any) => void;
  redemptions: Redemption[];
  showToast: (title: string, message: string) => void;
}

const RewardsView: React.FC<RewardsViewProps> = ({ userProfile, redeemReward, redemptions, showToast }) => {
  const [activeCategory, setActiveCategory] = useState<string>(FILTERED_CATEGORIES[0].id);
  const [selectedOption, setSelectedOption] = useState<RewardOption | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [voucherCode, setVoucherCode] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<{ticketNumber: string, drawTitle: string, date: string} | null>(null);

  const category = FILTERED_CATEGORIES.find(c => c.id === activeCategory)!;
  const CategoryIcon = (Icons as any)[category.iconName];

  const updateBerries = async (amount: number) => {
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        berry: increment(amount)
      });
    } catch (e) {
      console.error(e);
      showToast('Error', 'Failed to update balance.');
    }
  };

  const handleConfirm = () => {
    if (!selectedOption) return;
    if (userProfile.berry < selectedOption.cost) {
      showToast('Insufficient Berry', `You need ${selectedOption.cost - userProfile.berry} more Berry to redeem this.`);
      setSelectedOption(null);
      return;
    }
    
    // For vouchers, generate a mock voucher code
    const details: any = {};
    if (activeCategory === 'vouchers') {
      const code = Array.from({ length: 3 }, () => Math.random().toString(36).substring(2, 6).toUpperCase()).join('-');
      details.voucherCode = code;
      setVoucherCode(code);
    }
    
    redeemReward(selectedOption, details);
    
    setShowSuccess(true);
    if (activeCategory === 'cash') {
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedOption(null);
      }, 2000);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full flex flex-col"
    >
      <div className="p-6 pb-2">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Rewards Store</h2>
        <p className="text-gray-500 text-sm mb-6">Spend your berries on awesome rewards.</p>
        
        {/* Horizontal Category Scroll */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
          {FILTERED_CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            const Icon = (Icons as any)[cat.iconName];
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap font-medium text-sm transition-colors border ${
                  isActive 
                    ? `bg-gray-100 text-gray-900 border-gray-300` 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {Icon && <Icon size={16} />}
                {cat.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Options List */}
      <div className="flex-1 p-6 pt-2 space-y-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {category.options.map(option => {
              const canAfford = userProfile.berry >= option.cost;
              let myTickets = redemptions.filter(r => r.rewardId === option.id);
              
              // Inject mock tickets for 'r3' to demonstrate the horizontal scroll UI
              if (option.id === 'r3' && myTickets.length === 0) {
                myTickets = Array.from({ length: 12 }, (_, i) => ({
                  id: `mock-${i}`,
                  userId: userProfile.uid,
                  rewardId: 'r3',
                  cost: 100,
                  details: { ticketNumber: `#TKT-M${1000 + i}` },
                  redeemedAt: null
                }));
              }

              return (
                <div key={option.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-4">
                    {activeCategory === 'vouchers' && (
                      <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm ${
                        option.id === 'v1' ? 'bg-[#2BFF93] text-black' :
                        option.id === 'v2' ? 'bg-[#F68B1E] text-white' :
                        'bg-[#FFCC00] text-[#00A082]'
                      }`}>
                        {option.id === 'v1' ? 'B' : option.id === 'v2' ? 'J' : 'G'}
                      </div>
                    )}
                    {activeCategory === 'charity' && option.logo && (
                      <div className="w-12 h-12 shrink-0 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                        <img src={option.logo} alt={option.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 text-lg">{option.title}</h4>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-1 text-primary font-semibold bg-gray-100 px-2.5 py-1 rounded-lg">
                        <Coins size={16} />
                        {option.cost}
                      </div>
                      {option.status && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap ${
                          option.status === 'Open' ? 'bg-secondary/10 text-secondary' :
                          option.status === 'Drawing Soon' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {option.status}
                        </span>
                      )}
                    </div>
                  </div>
                   {option.status !== 'Closed' && (
                    <button
                      onClick={() => setSelectedOption(option)}
                      className="w-full bg-accent text-white py-3 px-5 rounded-full font-semibold text-base flex items-center justify-between transition-all hover:opacity-90 active:scale-[0.98] shadow-sm mt-2 group"
                    >
                      <span>{activeCategory === 'vouchers' ? 'Get Voucher' : activeCategory === 'charity' ? 'Donate Now' : 'Redeem Now'}</span>
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-primary group-hover:translate-x-1 transition-transform">
                        <Icons.ArrowRight size={16} />
                      </div>
                    </button>
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Ticket Details Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl relative"
            >
              <button 
                onClick={() => setSelectedTicket(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <Icons.X size={20} />
              </button>
              
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-primary mb-4 mx-auto">
                <Ticket size={32} />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Ticket Details</h3>
              
              <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Draw</span>
                  <span className="font-medium text-gray-900">{selectedTicket.drawTitle}</span>
                </div>
                <div className="h-px bg-gray-200 w-full"></div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Ticket Number</span>
                  <span className="font-bold font-mono text-lg text-primary">{selectedTicket.ticketNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Purchased</span>
                  <span className="font-medium text-gray-900">{selectedTicket.date}</span>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedTicket(null)}
                className="w-full bg-gray-100 text-gray-700 py-3.5 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {selectedOption && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-6"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full sm:w-[360px] rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-10 sm:pb-8 shadow-xl"
            >
              {showSuccess ? (
                <div className="py-8 flex flex-col items-center text-center">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-gray-100 text-primary rounded-full flex items-center justify-center mb-4"
                  >
                    <CheckCircle2 size={40} />
                  </motion.div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    {activeCategory === 'vouchers' ? 'Voucher Generated!' : 
                     activeCategory === 'charity' ? 'Donation Successful!' : 
                     'Redemption Successful!'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {activeCategory === 'vouchers' ? 'Your gift voucher is ready to use.' : 
                     activeCategory === 'charity' ? selectedOption.impactMessage : 
                     'Funds have been added to your wallet.'}
                  </p>

                  {activeCategory === 'vouchers' && voucherCode && (
                    <div className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 mb-6 relative group">
                       <p className="text-xs text-gray-400 uppercase font-bold tracking-widest mb-1">Voucher Code</p>
                       <p className="text-3xl font-mono font-bold text-gray-900 tracking-wider select-all">{voucherCode}</p>
                       <button 
                         onClick={() => {
                           navigator.clipboard.writeText(voucherCode);
                           showToast('Copied', 'Voucher code copied to clipboard!');
                         }}
                         className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
                         title="Copy Code"
                       >
                         <Icons.Copy size={18} />
                       </button>
                    </div>
                  )}

                  <div className="w-full space-y-3">
                    {activeCategory === 'vouchers' && (
                      <button 
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: 'My Reward Voucher',
                              text: `I just redeemed a ${selectedOption?.title} voucher! Code: ${voucherCode}`,
                            }).catch(() => {});
                          } else {
                            navigator.clipboard.writeText(`I just redeemed a ${selectedOption?.title} voucher! Code: ${voucherCode}`);
                            showToast('Copied', 'Voucher details copied to clipboard!');
                          }
                        }}
                        className="w-full bg-primary text-white py-4 rounded-xl font-medium text-lg hover:bg-primary/90 transition-colors shadow-sm flex justify-center items-center gap-2"
                      >
                        <Icons.Share2 size={20} />
                        Share Voucher
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (activeCategory === 'charity') {
                           if (navigator.share) {
                             navigator.share({
                               title: 'I just donated!',
                               text: `I just donated to ${selectedOption.title} via berry app. ${selectedOption.impactMessage}`,
                             }).catch(() => {});
                           } else {
                             navigator.clipboard.writeText(`I just donated to ${selectedOption.title}. ${selectedOption.impactMessage}`);
                             showToast('Copied', 'Impact details copied to clipboard!');
                           }
                        }
                        setShowSuccess(false);
                        setSelectedOption(null);
                        setVoucherCode(null);
                      }}
                      className="w-full bg-white text-gray-700 py-4 rounded-xl font-medium text-lg hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                      {activeCategory === 'vouchers' ? 'Done' : 
                       activeCategory === 'charity' ? 'Share Impact' : 'Close'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden" />
                  <div className={`w-16 h-16 rounded-full bg-gray-100 text-primary flex items-center justify-center mx-auto mb-4`}>
                    {CategoryIcon && <CategoryIcon size={32} />}
                  </div>
                  <h3 className="text-2xl font-semibold text-center text-gray-900 mb-2">Confirm Redemption</h3>
                  <p className="text-center text-gray-500 mb-6">
                    Spend <span className="font-medium text-gray-900">{selectedOption.cost} Berry</span> on {selectedOption.title}?
                  </p>
                  
                  {userProfile.berry < selectedOption.cost && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 flex items-start gap-2 text-sm font-medium border border-red-100">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>Not enough Berry. You need {selectedOption.cost - userProfile.berry} more Berry.</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <button 
                      onClick={handleConfirm}
                      disabled={userProfile.berry < selectedOption.cost}
                      className="w-full bg-accent text-white py-4 px-6 rounded-full font-semibold text-lg flex items-center justify-between transition-all hover:opacity-90 active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <span>Confirm & Redeem</span>
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary group-hover:translate-x-1 transition-transform">
                        <Icons.ArrowRight size={20} />
                      </div>
                    </button>
                    <button 
                      onClick={() => setSelectedOption(null)}
                      className="w-full bg-white text-gray-700 py-4 rounded-xl font-medium text-lg hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default RewardsView;
