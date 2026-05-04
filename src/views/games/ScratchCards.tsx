import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Coins, Grid } from 'lucide-react';
import { UserProfile } from '../../types';

interface ScratchCardsProps {
  userProfile: UserProfile;
  showToast: (title: string, message: string) => void;
  updateBerries: (amount: number) => void;
}

type PrizeType = 'refund' | 'multiplier' | 'voucher' | 'none';

interface Tile {
  id: number;
  revealed: boolean;
  prize: PrizeType;
}

export const ScratchCards: React.FC<ScratchCardsProps> = ({ userProfile, showToast, updateBerries }) => {
  const [activeCard, setActiveCard] = useState<Tile[] | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [cardPrize, setCardPrize] = useState<PrizeType>('none');
  const COST = 15;

  const determinePrize = (): PrizeType => {
    const rand = Math.random();
    if (rand < 0.6) return 'none'; // 60%
    if (rand < 0.85) return 'refund'; // 25%
    if (rand < 0.95) return 'multiplier'; // 10%
    return 'voucher'; // 5%
  };

  const buyCard = () => {
    if (userProfile.berry < COST) {
      showToast('Insufficient Berry', `You need ${COST} Berry to play.`);
      return;
    }
    updateBerries(-COST);
    
    const overallPrize = determinePrize();
    setCardPrize(overallPrize);

    // We populate the 9 tiles. 3 must match the overall prize if it's a win.
    // Otherwise, mix it up.
    let tilesArr: PrizeType[] = [];
    if (overallPrize !== 'none') {
      tilesArr = [overallPrize, overallPrize, overallPrize, 'none', 'none', 'refund', 'multiplier', 'voucher', 'none'];
    } else {
      tilesArr = ['none', 'none', 'refund', 'none', 'voucher', 'multiplier', 'none', 'none', 'refund'];
    }
    // shuffle
    tilesArr.sort(() => Math.random() - 0.5);

    setActiveCard(tilesArr.map((prize, i) => ({ id: i, revealed: false, prize })));
    setRevealedCount(0);
  };

  const handleScratch = (id: number) => {
    if (!activeCard) return;
    const newTiles = [...activeCard];
    const tile = newTiles.find(t => t.id === id);
    if (tile && !tile.revealed) {
      tile.revealed = true;
      setActiveCard(newTiles);
      setRevealedCount(count => count + 1);
    }
  };

  const getPrizeText = (prize: PrizeType) => {
    if (prize === 'refund') return '30 Berry';
    if (prize === 'multiplier') return '2x Survey';
    if (prize === 'voucher') return '₦200 Voucher';
    return 'Nothing';
  };

  const getPrizeContent = (prize: PrizeType) => {
    if (prize === 'refund') return <div className="flex flex-col items-center"><Coins size={24} className="text-[#4c203b] mb-1" /><span className="text-[#4c203b] text-xs font-bold leading-none">30</span></div>;
    if (prize === 'multiplier') return <div className="flex flex-col items-center"><span className="text-[#e6953d] font-black text-xl leading-none mb-1">2x</span><span className="text-[#e6953d] text-[10px] font-bold uppercase leading-none">Survey</span></div>;
    if (prize === 'voucher') return <div className="flex flex-col items-center"><span className="text-[#00A082] font-black text-xl leading-none mb-1">₦200</span><span className="text-[#00A082] text-[10px] font-bold uppercase leading-none">Voucher</span></div>;
    return <div className="text-gray-300 font-bold text-3xl">✕</div>;
  };

  const claimPrize = () => {
    if (cardPrize === 'refund') {
      updateBerries(30);
      showToast('Claimed', '30 Berry added to your balance.');
    } else if (cardPrize !== 'none') {
      showToast('Claimed', `You received: ${getPrizeText(cardPrize)}!`);
    } else {
       showToast('Better luck next time!', 'Try buying another card.');
    }
    setActiveCard(null);
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Scratch & Win</h3>
          <p className="text-gray-500 text-sm">Match 3 to win huge prizes!</p>
        </div>
        <div className="flex items-center gap-1 text-primary font-bold bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
          <Coins size={16} /> {COST}
        </div>
      </div>

      {!activeCard ? (
        <div className="flex flex-col flex-1 min-h-[300px] items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
          <Grid size={48} className="text-gray-300 mb-4" />
          <p className="text-gray-600 mb-6">Buy a new scratch card to reveal hidden prizes.</p>
          <button 
            onClick={buyCard}
            className="bg-primary text-white py-3 px-8 rounded-full font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            Buy Card for {COST} Berry
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-[280px] sm:max-w-xs mb-8">
            {activeCard.map(tile => (
              <div 
                key={tile.id} 
                onClick={() => handleScratch(tile.id)}
                onPointerEnter={() => handleScratch(tile.id)}
                onPointerDown={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); handleScratch(tile.id); }}
                className="aspect-square relative cursor-pointer group [perspective:1000px] touch-none"
              >
                <motion.div 
                  initial={false}
                  animate={{ rotateY: tile.revealed ? 180 : 0 }}
                  transition={{ duration: 0.4 }}
                  className="w-full h-full [transform-style:preserve-3d]"
                >
                  {/* Front: Covered */}
                  <div className="absolute inset-0 [backface-visibility:hidden] bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl sm:rounded-2xl flex items-center justify-center border-t border-white/50 shadow-sm overflow-hidden group-hover:from-gray-400 group-hover:to-gray-500 transition-colors">
                     <div className="w-full h-full opacity-30 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)]" />
                     <Coins className="absolute text-white/50" size={24} />
                  </div>
                  
                  {/* Back: Revealed */}
                  <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-white rounded-xl sm:rounded-2xl flex items-center justify-center border border-gray-200 shadow-inner">
                    {getPrizeContent(tile.prize)}
                  </div>
                </motion.div>
              </div>
            ))}
          </div>

          {revealedCount === 9 && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center w-full"
            >
              <h4 className="text-2xl font-bold mb-2 text-gray-900 drop-shadow-sm">
                {cardPrize === 'none' ? 'No Match!' : 'Winner!'}
              </h4>
              <p className="text-gray-600 mb-6">
                 {cardPrize === 'none' ? 'You didn\'t uncover 3 matching symbols.' : `You won ${getPrizeText(cardPrize)}!`}
              </p>
              <button 
                onClick={claimPrize}
                className="w-full max-w-[200px] bg-gray-900 text-white font-semibold py-3 px-6 rounded-full"
              >
                {cardPrize === 'none' ? 'Try Again' : 'Claim Prize'}
              </button>
            </motion.div>
          )}
          {revealedCount < 9 && (
            <p className="text-gray-500 text-sm font-medium animate-pulse">Scratch the tiles...</p>
          )}
        </div>
      )}
    </div>
  );
};
