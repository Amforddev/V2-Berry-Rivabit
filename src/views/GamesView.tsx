import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2, ScrollText, PlayCircle, Ticket, Grid, Dna, TrendingUp } from 'lucide-react';
import { UserProfile, Redemption } from '../types';
import { Draws } from './games/Draws';
import { ScratchCards } from './games/ScratchCards';
import { SpinWheel } from './games/SpinWheel';
import { Predictions } from './games/Predictions';
import { REWARD_CATEGORIES } from '../data';
import { TriviaNight } from './games/TriviaNight';
import { WordGuess } from './games/WordGuess';
import { BerryRush } from './games/BerryRush';

interface GamesViewProps {
  userProfile: UserProfile;
  updateBerries: (amount: number) => void;
  redemptions: Redemption[];
  showToast: (title: string, message: string) => void;
  setView: (view: string) => void;
}

export const GamesView: React.FC<GamesViewProps> = ({ userProfile, updateBerries, redemptions, showToast, setView }) => {
  const [activeTab, setActiveTab] = useState<'trivia' | 'wordle' | 'rush' | 'raffle' | 'scratch' | 'wheel' | 'predict'>('trivia');

  return (
    <div className="flex-1 flex flex-col bg-gray-50 pb-bottom relative overflow-hidden">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-4 shadow-sm z-10 sticky top-0">
        <h1 className="text-3xl font-black text-gray-900 mt-2 mb-1.5 flex items-center gap-2">
          <Gamepad2 className="text-primary" size={32} />
          Games Night
        </h1>
        <p className="text-gray-500 text-sm mb-6">Play casually, earn berries instantly.</p>
        
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
          <button 
            onClick={() => setActiveTab('raffle')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'raffle' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'}`}
          >
            <Ticket size={16} /> Draws
          </button>
          <button 
            onClick={() => setActiveTab('scratch')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'scratch' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'}`}
          >
            <Grid size={16} /> Scratch
          </button>
          <button 
            onClick={() => setActiveTab('wheel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'wheel' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'}`}
          >
            <Dna size={16} /> Spin
          </button>
          <button 
            onClick={() => setActiveTab('predict')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'predict' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'}`}
          >
            <TrendingUp size={16} /> Predict
          </button>
          <button 
            onClick={() => setActiveTab('trivia')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'trivia' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'}`}
          >
            <ScrollText size={16} /> Trivia
          </button>
          <button 
            onClick={() => setActiveTab('wordle')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'wordle' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'}`}
          >
            <span className="font-mono text-lg leading-none -mt-0.5 tracking-tighter">ABC</span> Word
          </button>
          <button 
            onClick={() => setActiveTab('rush')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'rush' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'}`}
          >
            <PlayCircle size={16} /> Rush
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 pt-6 overflow-y-auto w-full max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'raffle' && <Draws userProfile={userProfile} updateBerries={updateBerries} showToast={showToast} options={REWARD_CATEGORIES.find(c => c.id === 'raffle')?.options || []} redemptions={redemptions.filter(r => r.rewardId.startsWith('r'))} />}
            {activeTab === 'scratch' && <ScratchCards userProfile={userProfile} updateBerries={updateBerries} showToast={showToast} />}
            {activeTab === 'wheel' && <SpinWheel userProfile={userProfile} updateBerries={updateBerries} showToast={showToast} />}
            {activeTab === 'predict' && <Predictions userProfile={userProfile} updateBerries={updateBerries} showToast={showToast} />}
            {activeTab === 'trivia' && <TriviaNight userProfile={userProfile} updateBerries={updateBerries} showToast={showToast} />}
            {activeTab === 'wordle' && <WordGuess userProfile={userProfile} updateBerries={updateBerries} showToast={showToast} />}
            {activeTab === 'rush' && <BerryRush userProfile={userProfile} updateBerries={updateBerries} showToast={showToast} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
