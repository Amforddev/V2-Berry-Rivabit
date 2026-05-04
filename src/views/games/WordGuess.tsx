import React, { useState, useEffect } from 'react';
import { HelpCircle, Coins, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../../types';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface WordGuessProps {
  userProfile: UserProfile;
  updateBerries: (amount: number) => void;
  showToast: (title: string, message: string) => void;
}

const WORDS = [
  { word: "BERRY", hint: "A small, pulpy, and often edible fruit." },
  { word: "APPLE", hint: "A round fruit with red or green skin." },
  { word: "MANGO", hint: "A tropical stone fruit." },
  { word: "JUICE", hint: "Liquid extracted from fruits." },
  { word: "SWEET", hint: "Having the pleasant taste characteristic of sugar." },
  { word: "FRESH", hint: "Recently made or obtained." },
  { word: "LEMON", hint: "A sour yellow fruit." },
  { word: "PEACH", hint: "A round stone fruit with juicy yellow flesh." },
  { word: "GRAPE", hint: "A small, sweet fruit that grows in bunches." },
  { word: "MELON", hint: "A large, sweet fruit, such as a watermelon or cantaloupe." },
  { word: "GUAVA", hint: "A tropical fruit with pale green skin." },
  { word: "PLUMS", hint: "Small dark red or purple fruits." },
  { word: "WATER", hint: "Essential clear liquid." },
  { word: "PLANT", hint: "A living organism that grows in earth." }
];

export const WordGuess: React.FC<WordGuessProps> = ({ userProfile, updateBerries, showToast }) => {
  const [wordObj, setWordObj] = useState(WORDS[0]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [hasWon, setHasWon] = useState(false);
  const [hasLost, setHasLost] = useState(false);
  
  useEffect(() => {
    setWordObj(WORDS[Math.floor(Math.random() * WORDS.length)]);
  }, []);

  const answer = wordObj.word;
  
  const handleKey = async (key: string) => {
    if (hasWon || hasLost) return;
    
    if (key === 'ENTER') {
      if (currentGuess.length !== 5) {
        showToast('Not enough letters', 'Word must be 5 letters.');
        return;
      }
      const newGuesses = [...guesses, currentGuess];
      setGuesses(newGuesses);
      setCurrentGuess("");
      
      let won = false;
      let lost = false;

      if (currentGuess === answer) {
        won = true;
        setHasWon(true);
        updateBerries(20);
        showToast('You Won!', '20 Berries added to your account.');
      } else if (newGuesses.length >= 6) {
        lost = true;
        setHasLost(true);
      }

      // Record finished games
      if (won || lost) {
        try {
          await addDoc(collection(db, 'gameSessions'), {
            userId: userProfile.uid,
            game: 'WordGuess',
            status: won ? 'won' : 'lost',
            guesses: newGuesses,
            endedAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'gameSessions');
        }
      }

    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (currentGuess.length < 5) {
      setCurrentGuess(prev => prev + key);
    }
  };

  const handleHint = () => {
    if (userProfile.berry < 10) {
      showToast('Not enough berries', 'You need 10 berries for a hint.');
      return;
    }
    updateBerries(-10);
    // Find a letter that hasn't been guessed correctly
    const correctGuessedLetters = new Set<string>();
    guesses.forEach(guess => {
      for (let i = 0; i < 5; i++) {
        if (guess[i] === answer[i]) {
          correctGuessedLetters.add(answer[i]);
        }
      }
    });
    
    let hintLetter = '';
    for (let i = 0; i < 5; i++) {
      if (!correctGuessedLetters.has(answer[i])) {
        hintLetter = answer[i];
        break;
      }
    }
    
    if (hintLetter) {
      showToast('Hint (-10 Berry)', `Try using the letter '${hintLetter}'`);
    } else {
      showToast('Hint', 'You already got all the letters, just arrange them!');
      updateBerries(10); // Refund
    }
  };

  const keyboardRows = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['ENTER','Z','X','C','V','B','N','M','BACKSPACE']
  ];

  return (
    <div className="flex flex-col items-center bg-white p-6 rounded-[2rem] border border-gray-100 min-h-full">
      <div className="w-full flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Word Guess</h2>
          <p className="text-gray-500 text-sm">Guess the 5-letter word.</p>
          <div className="mt-2 text-[#e6953d] font-medium bg-[#fff5e6] px-3 py-1.5 rounded-lg text-sm inline-block">
            <span className="opacity-70 uppercase text-[10px] tracking-wider block mb-0.5">Clue</span>
            {wordObj.hint}
          </div>
        </div>
        <button 
          onClick={handleHint}
          disabled={hasWon || hasLost}
          className="flex items-center gap-1.5 bg-[#fff5e6] text-[#e6953d] px-3 py-1.5 rounded-xl font-bold text-sm disabled:opacity-50"
        >
          <HelpCircle size={16} /> Hint (-10)
        </button>
      </div>

      {(hasWon || hasLost) && (
        <div className={`mb-6 p-4 rounded-xl w-full flex flex-col items-center text-center ${hasWon ? 'bg-[#e6fcf2] text-[#00A082]' : 'bg-[#fcede8] text-[#c96c6c]'}`}>
          {hasWon ? <CheckCircle2 size={32} className="mb-2" /> : <div className="text-3xl font-bold mb-2">✗</div>}
          <p className="font-bold text-lg mb-4">{hasWon ? 'You Won 20 Berries!' : `Game Over! Word was ${answer}`}</p>
          <button 
            onClick={() => {
              setGuesses([]);
              setCurrentGuess("");
              setHasWon(false);
              setHasLost(false);
              setWordObj(WORDS[Math.floor(Math.random() * WORDS.length)]);
            }}
            className={`px-6 py-2 rounded-full font-bold text-white shadow-sm transition-transform active:scale-95 ${hasWon ? 'bg-[#00A082] hover:bg-[#008f75]' : 'bg-[#c96c6c] hover:bg-[#b05a5a]'}`}
          >
            Play Again
          </button>
        </div>
      )}

      <div className="grid grid-rows-6 gap-2 mb-8 mt-2">
        {Array.from({ length: 6 }).map((_, rowIndex) => {
          const guess = guesses[rowIndex];
          const isCurrentRow = rowIndex === guesses.length;
          
          return (
            <div key={rowIndex} className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, colIndex) => {
                const letter = guess ? guess[colIndex] : (isCurrentRow ? currentGuess[colIndex] : "");
                let bgCls = 'bg-gray-50 border-gray-200';
                let textCls = 'text-[#1e293b]';
                
                if (guess) {
                  if (guess[colIndex] === answer[colIndex]) {
                    bgCls = 'bg-[#00A082] border-[#00A082]'; 
                    textCls = 'text-white';
                  } else if (answer.includes(guess[colIndex])) {
                    bgCls = 'bg-[#F68B1E] border-[#F68B1E]';
                    textCls = 'text-white';
                  } else {
                    bgCls = 'bg-gray-400 border-gray-400';
                    textCls = 'text-white';
                  }
                } else if (letter) {
                  bgCls = 'bg-white border-gray-400';
                  textCls = 'text-[#1e293b]';
                }

                return (
                  <div key={colIndex} className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-2xl font-bold rounded-lg border-2 ${bgCls} ${textCls}`}>
                    <span className={textCls}>{letter}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="w-full max-w-[400px] flex flex-col gap-2">
        {keyboardRows.map((row, i) => (
          <div key={i} className="flex justify-center gap-1.5">
            {row.map(key => (
              <button 
                key={key}
                onClick={() => handleKey(key)}
                className={`font-semibold rounded border border-gray-200 transition-colors active:bg-gray-200 text-[#1e293b]
                  ${key === 'ENTER' || key === 'BACKSPACE' ? 'px-2 py-4 text-xs bg-gray-100 flex-1' : 'w-8 sm:w-10 py-4 text-sm bg-gray-50'}`}
              >
                {key === 'BACKSPACE' ? '⌫' : key}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
