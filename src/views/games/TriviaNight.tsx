import React, { useState, useEffect } from 'react';
import { Clock, Play, Trophy, Users } from 'lucide-react';
import { UserProfile } from '../../types';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface TriviaNightProps {
  userProfile: UserProfile;
  updateBerries: (amount: number) => void;
  showToast: (title: string, message: string) => void;
}

export const TriviaNight: React.FC<TriviaNightProps> = ({ userProfile, updateBerries, showToast }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [score, setScore] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Mock questions
  const questions = [
    { q: "What is the capital of Nigeria?", options: ["Lagos", "Abuja", "Kano", "Ibadan"], a: 1 },
    { q: "Which of these is a popular Nigerian dish?", options: ["Jollof Rice", "Sushi", "Tacos", "Pizza"], a: 0 },
    { q: "Who won the 2023 AFCON?", options: ["Nigeria", "Senegal", "Ivory Coast", "Egypt"], a: 2 },
  ];

  const handleStart = async () => {
    if (userProfile.berry < 5) {
      showToast('Not enough berries', 'You need 5 berries to play.');
      return;
    }
    updateBerries(-5);
    setIsPlaying(true);
    setQuestionIndex(0);
    setScore(0);
    setTimeLeft(20);

    // Create session in Firestore
    try {
      const docRef = await addDoc(collection(db, 'gameSessions'), {
        userId: userProfile.uid,
        game: 'TriviaNight',
        score: 0,
        status: 'playing',
        entryFee: 5,
        startedAt: serverTimestamp()
      });
      setSessionId(docRef.id);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'gameSessions');
    }
  };

  const handleAnswer = async (index: number) => {
    let currentScore = score;
    if (index === questions[questionIndex].a) {
      currentScore += 100 + (timeLeft * 10);
      setScore(currentScore);
    }
    
    if (questionIndex < questions.length - 1) {
      setQuestionIndex(q => q + 1);
      setTimeLeft(20);
    } else {
      setIsPlaying(false);
      showToast('Trivia Complete!', `You scored ${currentScore} points!`);
      
      // Update session in Firestore could be done here if needed.
      // For now we just record another document or we could update.
      try {
        await addDoc(collection(db, 'gameSessions'), {
           userId: userProfile.uid,
           game: 'TriviaNight',
           score: currentScore,
           status: 'completed',
           sessionId: sessionId || 'unknown',
           endedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'gameSessions');
      }
    }
  };

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isPlaying && timeLeft === 0) {
      handleAnswer(-1); // wrong answer when time's up
    }
  }, [isPlaying, timeLeft]);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-gradient-to-br from-[#4c203b] to-[#2a1221] p-6 rounded-[2rem] text-white">
        <h2 className="text-2xl font-bold mb-2">Trivia Night</h2>
        <p className="text-white/80 text-sm mb-4">Daily 8pm-10pm • 5 Berry Entry</p>
        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg text-sm">
            <Trophy size={16} className="text-yellow-400" />
            <span>1st: 500 Berry</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg text-sm">
            <Users size={16} />
            <span>2.4k playing</span>
          </div>
        </div>

        {!isPlaying ? (
          <button 
            onClick={handleStart}
            className="w-full bg-white text-[#4c203b] py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
          >
            <Play size={20} /> Play Now (-5 Berry)
          </button>
        ) : (
          <div className="bg-white text-gray-900 p-6 rounded-2xl">
             <div className="flex justify-between items-center mb-6">
               <span className="font-bold text-gray-500">Q{questionIndex + 1}/{questions.length}</span>
               <div className="flex items-center gap-1.5 text-red-500 font-bold">
                 <Clock size={16} /> {timeLeft}s
               </div>
             </div>
             <h3 className="text-xl font-bold mb-6">{questions[questionIndex].q}</h3>
             <div className="space-y-3">
               {questions[questionIndex].options.map((opt, i) => (
                 <button 
                   key={i}
                   onClick={() => handleAnswer(i)}
                   className="w-full text-left p-4 rounded-xl border-2 border-gray-100 font-semibold hover:border-[#4c203b] hover:bg-gray-50 transition-colors"
                 >
                   {opt}
                 </button>
               ))}
             </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-gray-100">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Trophy size={20} className="text-yellow-500" /> Live Leaderboard</h3>
        <div className="space-y-4">
          {[1,2,3].map((pos) => (
             <div key={pos} className="flex justify-between items-center p-3 rounded-xl bg-gray-50">
               <div className="flex items-center gap-3">
                 <span className={`font-bold w-6 text-center ${pos === 1 ? 'text-yellow-500' : pos === 2 ? 'text-gray-400' : 'text-amber-700'}`}>#{pos}</span>
                 <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                 <span className="font-medium text-gray-900">Player {Math.floor(Math.random() * 1000)}</span>
               </div>
               <span className="font-bold text-[#4c203b]">{(4 - pos) * 1540} pts</span>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
};
