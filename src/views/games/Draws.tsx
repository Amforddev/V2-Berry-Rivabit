import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ticket as TicketIcon, Users, Clock, AlertCircle, Coins, ArrowRight } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';


interface DrawsProps {
  userProfile: UserProfile;
  showToast: (title: string, message: string) => void;
  updateBerries: (amount: number) => void;
  options: RewardOption[]; // The draw tiers from REWARD_CATEGORIES
  redemptions?: Redemption[];
}

export const Draws: React.FC<DrawsProps> = ({ userProfile, showToast, updateBerries, options, redemptions = [] }) => {
  const [selectedDraw, setSelectedDraw] = useState<RewardOption | null>(null);
  const [ticketCount, setTicketCount] = useState(1);
  const [showPoolModal, setShowPoolModal] = useState<RewardOption | null>(null);
  const [poolContribution, setPoolContribution] = useState(100);
  const [showTicketsModal, setShowTicketsModal] = useState<{ drawTitle: string; tickets: Redemption[] } | null>(null);
  
  // Real-time countdown
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getDrawDate = (tierId: string): Date => {
    const d = new Date(now);
    if (tierId === 'r1') {
      // Daily 11:59pm
      d.setHours(23, 59, 59, 0);
    } else if (tierId === 'r2') {
      // Friday
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 6 ? 6 : 5); 
      d.setDate(diff);
      d.setHours(23, 59, 59, 0);
    } else if (tierId === 'r3') {
      // Last day of month
      d.setMonth(d.getMonth() + 1, 0);
      d.setHours(23, 59, 59, 0);
    } else if (tierId === 'r4') {
      // Quarter end
      const qEndMonth = Math.ceil((d.getMonth() + 1) / 3) * 3;
      d.setMonth(qEndMonth, 0);
      d.setHours(23, 59, 59, 0);
    } else if (tierId === 'r5') {
       // Dec 31
       d.setMonth(11, 31);
       d.setHours(23, 59, 59, 0);
    }
    // If past, push to next cycle (simple logic for now)
    if (d < now) d.setDate(d.getDate() + 1);
    return d;
  };

  const getTimeLeft = (date: Date) => {
    const diff = date.getTime() - now.getTime();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);
    return { d: Math.floor(h/24), h: h % 24, m, s };
  };

  const handleBuyTicket = async () => {
    if (!selectedDraw) return;
    const totalCost = selectedDraw.cost * ticketCount;
    if (userProfile.berry < totalCost) {
      showToast('Error', 'Insufficient Berry balance.');
      return;
    }
    updateBerries(-totalCost);
    
    // Create new tickets in DB
    try {
      const promises = Array.from({ length: ticketCount }).map(() => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const randStr = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const ticketNum = `#TKT-${randStr}`;
        return addDoc(collection(db, 'redemptions'), {
          userId: userProfile.uid,
          rewardId: selectedDraw.id,
          cost: selectedDraw.cost,
          redeemedAt: serverTimestamp(),
          details: { drawTitle: selectedDraw.title, ticketNumber: ticketNum }
        });
      });
      await Promise.all(promises);
      showToast('Success', `Bought ${ticketCount} ticket(s) for ${selectedDraw.title}`);
    } catch (e) {
      console.error(e);
      showToast('Error', 'Failed to generate tickets.');
      updateBerries(totalCost); // Refund
    }
    
    setSelectedDraw(null);
    setTicketCount(1);
  };

  const handleStartPool = () => {
     if (!showPoolModal) return;
     if (userProfile.berry < poolContribution) {
        showToast('Error', 'Insufficient Berry balance.');
        return;
     }
     updateBerries(-poolContribution);
     showToast('Pool Started!', `You contributed ${poolContribution} Berry. Share the link with friends to complete it!`);
     setShowPoolModal(null);
     setPoolContribution(100);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-800 to-primary rounded-3xl p-6 text-white mb-6">
        <h3 className="text-2xl font-bold mb-1">Big Wins Await</h3>
        <p className="text-purple-200 text-sm">Enter solo or pool tickets with friends.</p>
      </div>

      <div className="space-y-6">
        {options.map((opt) => {
          const drawDate = getDrawDate(opt.id);
          const timeLeft = getTimeLeft(drawDate);
          const myTickets = redemptions.filter(r => r.rewardId === opt.id);
          
          return (
            <div key={opt.id} className={`bg-white rounded-[2rem] shadow-sm border ${opt.id === 'r1' && myTickets.length > 0 ? 'border-amber-400 shadow-amber-400/20 shadow-xl' : 'border-gray-100'} p-6 relative overflow-hidden transition-all delay-75`}>
               {/* Winning Badge for mock */}
               {opt.id === 'r1' && myTickets.length > 0 && (
                 <div className="absolute top-0 left-0 w-full h-[60px] bg-amber-400 flex items-center justify-center -z-0">
                    <div className="absolute inset-0 bg-white/20 top-0 left-0 w-full h-full -skew-x-[45deg] animate-pulse"></div>
                 </div>
               )}
               {opt.id === 'r1' && myTickets.length > 0 && (
                 <div className="bg-amber-400 text-amber-900 font-bold px-4 py-2 rounded-full absolute top-[-10px] right-[-10px] shadow-sm rotate-12 uppercase text-xs z-20">Winner!</div>
               )}

               <div className={`flex justify-between items-start mb-4 relative z-10 ${opt.id === 'r1' && myTickets.length > 0 ? 'mt-8' : ''}`}>
                 <div className="pr-4">
                   <h4 className="font-semibold text-[18px] text-gray-900 leading-tight mb-1">{opt.title}</h4>
                   <p className="text-gray-500 text-base">{opt.description}</p>
                   
                   {/* Countdown Block */}
                   <div className="mt-4">
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
                       <Clock size={12} /> Draw automatically closes in
                     </p>
                     <div className="flex gap-1.5 items-end">
                       {timeLeft.d > 0 && (
                         <>
                           <div className="bg-[#4c203b] text-white px-2.5 py-1.5 rounded-lg shadow-sm text-center min-w-[36px]">
                             <div className="font-mono text-sm font-bold leading-none">{timeLeft.d}</div>
                             <div className="text-[8px] uppercase tracking-wider text-white/70 mt-0.5 leading-none">Day</div>
                           </div>
                           <span className="text-gray-400 font-bold mb-1.5">:</span>
                         </>
                       )}
                       <div className="bg-[#4c203b] text-white px-2.5 py-1.5 rounded-lg shadow-sm text-center min-w-[36px]">
                         <div className="font-mono text-sm font-bold leading-none">{timeLeft.h.toString().padStart(2, '0')}</div>
                         <div className="text-[8px] uppercase tracking-wider text-white/70 mt-0.5 leading-none">Hrs</div>
                       </div>
                       <span className="text-gray-400 font-bold mb-1.5">:</span>
                       <div className="bg-[#4c203b] text-white px-2.5 py-1.5 rounded-lg shadow-sm text-center min-w-[36px]">
                         <div className="font-mono text-sm font-bold leading-none">{timeLeft.m.toString().padStart(2, '0')}</div>
                         <div className="text-[8px] uppercase tracking-wider text-white/70 mt-0.5 leading-none">Min</div>
                       </div>
                       <span className="text-gray-400 font-bold mb-1.5">:</span>
                       <div className="bg-[#4c203b] text-white px-2.5 py-1.5 rounded-lg shadow-sm text-center min-w-[36px]">
                         <div className="font-mono text-sm font-bold leading-none">{timeLeft.s.toString().padStart(2, '0')}</div>
                         <div className="text-[8px] uppercase tracking-wider text-white/70 mt-0.5 leading-none">Sec</div>
                       </div>
                     </div>
                   </div>

                 </div>
                 <div className="flex flex-col items-end gap-2 shrink-0">
                   <div className="bg-gray-50 px-3 py-1.5 rounded-xl font-bold text-[#4c203b] border border-gray-100 flex items-center gap-1.5 text-lg">
                     <Coins size={18} /> {opt.cost}
                   </div>
                   <div className={`px-2 py-0.5 rounded text-xs font-bold tracking-wider uppercase ${opt.status === 'Open' ? 'bg-[#fcede8] text-[#c96c6c]' : 'bg-[#fff5e6] text-[#e6953d]'}`}>
                     {opt.status || 'OPEN'}
                   </div>
                 </div>
               </div>

               {/* Tickets Section */}
               {myTickets.length > 0 && (
                 <div className="mt-6 mb-4 space-y-3 pt-4 border-t border-gray-100">
                   <div className="flex justify-between items-center">
                     <div className="bg-gray-100 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 w-fit">
                       <TicketIcon size={16} />
                       <span>You have {myTickets.length} ticket{myTickets.length === 1 ? '' : 's'}</span>
                     </div>
                     {myTickets.length > 3 && (
                       <button 
                         onClick={() => setShowTicketsModal({ drawTitle: opt.title, tickets: myTickets })}
                         className="text-[#4c203b] text-xs font-bold px-3 py-1 right-0 rounded-lg bg-[#4c203b]/5 hover:bg-[#4c203b]/10 transition-colors uppercase tracking-wide"
                       >
                         View All
                       </button>
                     )}
                   </div>
                   <div className="relative">
                     <div className="flex overflow-x-auto gap-2 pb-1 pr-8 scrollbar-hide">
                       {myTickets.slice(0, 5).map((t, i) => (
                          <div key={t.id || i} className="border border-gray-200 px-3 py-1.5 rounded-lg text-sm font-mono text-gray-600 bg-white shadow-sm shrink-0 whitespace-nowrap">
                            {t.details?.ticketNumber || `#TKT-${t.id ? t.id.substring(0, 6).toUpperCase() : (i + 1).toString().padStart(6, '0')}`}
                          </div>
                       ))}
                       {myTickets.length > 5 && (
                         <div 
                           onClick={() => setShowTicketsModal({ drawTitle: opt.title, tickets: myTickets })}
                           className="border border-dashed border-gray-300 px-3 py-1.5 rounded-lg text-sm font-bold text-gray-400 bg-gray-50 flex items-center justify-center cursor-pointer hover:text-gray-600 shrink-0 whitespace-nowrap"
                         >
                           +{myTickets.length - 5} More
                         </div>
                       )}
                     </div>
                     {myTickets.length > 3 && (
                       <div className="absolute right-0 top-0 bottom-1 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none" />
                     )}
                   </div>
                 </div>
               )}

               <div className="mt-4 space-y-3">
                 <button 
                   onClick={() => setSelectedDraw(opt)}
                   className="w-full bg-[#6a304e] text-white rounded-full py-4 text-lg font-semibold flex items-center justify-between px-6 hover:bg-[#5b2943] transition-colors active:scale-[0.98]"
                 >
                   <span>Buy Ticket</span>
                   <div className="bg-white text-[#6a304e] p-1.5 rounded-full flex items-center justify-center">
                     <ArrowRight size={18} strokeWidth={3} />
                   </div>
                 </button>
                 {opt.cost >= 2000 && (
                   <button 
                     onClick={() => {
                        setShowPoolModal(opt);
                        setPoolContribution(Math.floor(opt.cost * 0.1));
                     }}
                     className="w-full bg-white border-2 border-gray-200 text-gray-800 rounded-full py-4 font-semibold hover:bg-gray-50 transition text-lg flex justify-center items-center gap-2"
                   >
                     <Users size={20} className="text-[#6a304e]" /> Start Pool
                   </button>
                 )}
               </div>
            </div>
          )
        })}
      </div>

      {/* Enter Draw Modal */}
      <AnimatePresence>
        {selectedDraw && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex items-end justify-center sm:p-4">
            <motion.div 
               initial={{ y: '100%' }}
               animate={{ y: 0 }}
               exit={{ y: '100%' }}
               className="bg-white w-full sm:w-[400px] rounded-t-[2rem] sm:rounded-3xl p-6 pb-safe shadow-2xl"
               style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
            >
               <h3 className="text-2xl font-bold mb-6 text-gray-900">Enter {selectedDraw.title.replace('Draw', '').trim()} Draw</h3>
               
               <div className="flex justify-between items-center mb-6 bg-gray-50/80 p-5 rounded-2xl border border-gray-100">
                 <span className="font-semibold text-gray-600 text-lg">Cost per ticket</span>
                 <span className="font-bold text-[#4c203b] text-2xl">{selectedDraw.cost}</span>
               </div>

               <div className="mb-8">
                 <label className="block text-base font-semibold text-gray-800 mb-3">Number of Tickets</label>
                 <div className="flex items-center justify-between bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                   <button 
                     onClick={() => setTicketCount(Math.max(1, ticketCount - 1))} 
                     className="w-14 h-14 flex items-center justify-center rounded-xl bg-white text-gray-900 font-bold text-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:bg-gray-50 active:scale-95 transition-all"
                   >-</button>
                   <span className="text-center font-bold text-3xl text-gray-900 w-20">{ticketCount}</span>
                   <button 
                     onClick={() => setTicketCount(ticketCount + 1)} 
                     className="w-14 h-14 flex items-center justify-center rounded-xl bg-white text-gray-900 font-bold text-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:bg-gray-50 active:scale-95 transition-all"
                   >+</button>
                 </div>
               </div>

               <div className="flex justify-between items-center mb-8 px-2">
                 <span className="text-gray-500 font-semibold text-lg">Total Cost:</span>
                 <span className="font-bold text-3xl text-gray-900">{selectedDraw.cost * ticketCount} Berry</span>
               </div>

               <div className="flex gap-4">
                 <button 
                   onClick={() => setSelectedDraw(null)} 
                   className="flex-1 bg-gray-50 font-bold text-lg py-5 rounded-2xl text-gray-600 hover:bg-gray-100 transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleBuyTicket} 
                   className="flex-1 bg-[#4c203b] text-white font-bold text-lg py-5 rounded-2xl shadow-[0_8px_20px_rgba(76,32,59,0.25)] hover:bg-[#3d192f] transition-all active:scale-[0.98]"
                 >
                   Buy Now
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pool Modal */}
      <AnimatePresence>
        {showPoolModal && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div 
               initial={{ y: '100%' }}
               animate={{ y: 0 }}
               exit={{ y: '100%' }}
               className="bg-white w-full sm:w-[380px] rounded-t-3xl sm:rounded-3xl p-6 pb-bottom shadow-2xl"
            >
               <div className="w-12 h-12 bg-purple-100 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                 <Users size={24} />
               </div>
               <h3 className="text-xl font-bold mb-2 text-center text-gray-900">Group Pool Ticket</h3>
               <p className="text-gray-500 text-sm text-center mb-6">Split the cost of a {showPoolModal.title} ticket ({showPoolModal.cost} Berry) with friends.</p>
               
               <div className="mb-6">
                 <label className="block text-sm font-semibold text-gray-700 mb-2">Your Contribution</label>
                 <input 
                   type="number" 
                   value={poolContribution}
                   onChange={(e) => setPoolContribution(Number(e.target.value))}
                   className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                   min={0}
                   max={showPoolModal.cost}
                 />
                 <div className="flex justify-between items-center mt-2 text-xs text-gray-500 font-medium px-1">
                   <span>Min: 10%</span>
                   <span>Your Share: {((poolContribution / showPoolModal.cost) * 100).toFixed(1)}%</span>
                 </div>
               </div>

               <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex gap-3 items-start">
                 <AlertCircle size={20} className="text-blue-500 shrink-0 mt-0.5" />
                 <p className="text-sm text-blue-800">If the ticket wins, the prize is automatically split based on each person's contribution percentage.</p>
               </div>

               <div className="flex gap-3">
                 <button onClick={() => setShowPoolModal(null)} className="flex-1 bg-gray-100 font-semibold py-4 rounded-xl text-gray-600">Cancel</button>
                 <button onClick={handleStartPool} className="flex-[2] bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg focus:ring-4 focus:ring-gray-200">Start & Share Pool</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Tickets View Modal */}
      <AnimatePresence>
        {showTicketsModal && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4">
            <motion.div 
               initial={{ y: '100%' }}
               animate={{ y: 0 }}
               exit={{ y: '100%' }}
               className="bg-gray-50 w-full sm:w-[420px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[80vh]"
            >
               {/* Modal Header */}
               <div className="bg-white p-6 rounded-t-3xl border-b border-gray-100 flex justify-between items-center shrink-0">
                 <div>
                   <h3 className="text-xl font-bold text-gray-900">{showTicketsModal.drawTitle}</h3>
                   <p className="text-sm font-medium text-gray-500 mt-1">
                     {showTicketsModal.tickets.length} Ticket{showTicketsModal.tickets.length === 1 ? '' : 's'} Owned
                   </p>
                 </div>
                 <button 
                   onClick={() => setShowTicketsModal(null)}
                   className="w-10 h-10 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                 >
                   &times;
                 </button>
               </div>

               {/* Tickets Scroll Area */}
               <div className="p-6 overflow-y-auto w-full max-h-full pb-safe flex flex-col items-center">
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
                   {showTicketsModal.tickets.map((t, idx) => {
                     const isWinner = showTicketsModal.drawTitle.includes('Daily') && idx === 0; // Mock winner condition matching r1 logic
                     const tNum = t.details?.ticketNumber || (t.id ? t.id.substring(0, 6).toUpperCase() : (idx + 1).toString().padStart(6, '0'));
                     return (
                       <div 
                         key={t.id || idx}
                         className={`relative flex flex-col border ${isWinner ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'} rounded-xl p-4 shadow-sm items-center justify-center`}
                       >
                         {isWinner && (
                           <div className="absolute top-0 right-0 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-bl-xl rounded-tr-xl">
                             WINNER
                           </div>
                         )}
                         <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1 mt-1">Ticket No.</span>
                         <span className={`font-mono text-base font-bold ${isWinner ? 'text-amber-700' : 'text-gray-700'}`}>
                           {tNum}
                         </span>
                       </div>
                     );
                   })}
                 </div>
                 <button 
                   onClick={() => setShowTicketsModal(null)} 
                   className="w-full bg-gray-900 text-white font-bold text-lg py-4 mt-6 rounded-2xl hover:bg-gray-800 transition-colors mb-bottom shrink-0"
                 >
                   Close
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
