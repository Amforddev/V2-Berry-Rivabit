import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Coins } from 'lucide-react';
import { UserProfile } from '../../types';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface BerryRushProps {
  userProfile: UserProfile;
  updateBerries: (amount: number) => void;
  showToast: (title: string, message: string) => void;
}

export const BerryRush: React.FC<BerryRushProps> = ({ userProfile, updateBerries, showToast }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  
  // Game state vars (avoiding re-renders for game loop)
  const gameState = useRef({
    playerY: 100,
    velocity: 0,
    gravity: 0.6,
    jump: -8,
    berries: [] as {x: number, y: number}[],
    obstacles: [] as {x: number, width: number, y: number, height: number}[],
    gameSpeed: 4,
    frameCount: 0,
    score: 0,
    isGameOver: false,
    sessionId: null as string | null
  });

  const initGame = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width || 400;
    canvas.height = rect.height || 300;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw ground
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    
    // Draw player idle
    ctx.fillStyle = '#4c203b';
    ctx.fillRect(50, 100, 20, 20);
  }, []);

  useEffect(() => {
    initGame();
    window.addEventListener('resize', initGame);
    return () => window.removeEventListener('resize', initGame);
  }, [initGame]);

  const startGame = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userProfile.berry < 2) {
      showToast('Not enough berries', 'You need 2 berries to play.');
      return;
    }
    updateBerries(-2);
    setIsPlaying(true);
    setScore(0);

    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    gameState.current = {
      playerY: canvas.height / 2,
      velocity: 0,
      gravity: 0.6,
      jump: -9,
      berries: [],
      obstacles: [],
      gameSpeed: 5,
      frameCount: 0,
      score: 0,
      isGameOver: false,
      sessionId: null
    };

    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(gameLoop);
    
    addDoc(collection(db, 'gameSessions'), {
      userId: userProfile.uid,
      game: 'BerryRush',
      score: 0,
      status: 'playing',
      entryFee: 2,
      startedAt: serverTimestamp()
    }).then(docRef => {
      gameState.current.sessionId = docRef.id;
    }).catch(err => {
      console.error(err);
    });
  };

  const handleTap = () => {
    if (isPlaying && !gameState.current.isGameOver) {
      gameState.current.velocity = gameState.current.jump;
    }
  };

  const gameOver = useCallback(async () => {
    gameState.current.isGameOver = true;
    setIsPlaying(false);
    
    const finalScore = gameState.current.score;
    const convertedBerries = Math.floor(finalScore / 100);
    
    if (convertedBerries > 0) {
      updateBerries(convertedBerries);
      showToast('Game Over', `You collected ${finalScore} points and earned ${convertedBerries} Berry!`);
    } else {
      showToast('Game Over', `You scored ${finalScore} points. Not enough to convert to Berry.`);
    }

    try {
      await addDoc(collection(db, 'gameSessions'), {
        userId: userProfile.uid,
        game: 'BerryRush',
        score: finalScore,
        earned: convertedBerries,
        status: 'completed',
        sessionId: gameState.current.sessionId || 'unknown',
        endedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'gameSessions');
    }
  }, [userProfile.uid, updateBerries, showToast]);

  const gameLoop = () => {
    if (!canvasRef.current || gameState.current.isGameOver) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = gameState.current;
    state.frameCount++;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Physics
    state.velocity += state.gravity;
    state.playerY += state.velocity;
    
    // Bounds Check
    if (state.playerY > canvas.height - 20) {
      state.playerY = canvas.height - 20;
      gameOver();
      return;
    }
    if (state.playerY < 0) {
      state.playerY = 0;
      state.velocity = 0;
    }

    // Spawn entities
    if (state.frameCount % 90 === 0) {
      const h = Math.random() * 80 + 40;
      const isTop = Math.random() > 0.5;
      state.obstacles.push({
        x: canvas.width,
        y: isTop ? 0 : canvas.height - h,
        width: 40,
        height: h
      });
    }
    if (state.frameCount % 50 === 0) {
      state.berries.push({
        x: canvas.width,
        y: Math.random() * (canvas.height - 60) + 30
      });
    }

    // Update game speed
    if (state.frameCount % 500 === 0) {
      state.gameSpeed += 0.5;
    }

    // Draw Obstacles
    ctx.fillStyle = '#1e293b';
    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const obs = state.obstacles[i];
      obs.x -= state.gameSpeed;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      
      // Collision
      if (
        50 < obs.x + obs.width &&
        50 + 20 > obs.x &&
        state.playerY < obs.y + obs.height &&
        state.playerY + 20 > obs.y
      ) {
        gameOver();
        return;
      }
      
      if (obs.x + obs.width < 0) state.obstacles.splice(i, 1);
    }

    // Draw Berries
    ctx.fillStyle = '#e6953d'; // Golden color
    for (let i = state.berries.length - 1; i >= 0; i--) {
      const berry = state.berries[i];
      berry.x -= state.gameSpeed;
      
      ctx.beginPath();
      ctx.arc(berry.x + 10, berry.y + 10, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Collision (collection)
      if (
        50 < berry.x + 20 &&
        70 > berry.x &&
        state.playerY < berry.y + 20 &&
        state.playerY + 20 > berry.y
      ) {
        state.score += 100;
        setScore(state.score);
        state.berries.splice(i, 1);
      } else if (berry.x + 20 < 0) {
        state.berries.splice(i, 1);
      }
    }

    // Draw player
    ctx.fillStyle = '#4c203b';
    ctx.fillRect(50, state.playerY, 20, 20);

    if (!state.isGameOver) {
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center bg-white p-6 rounded-[2rem] border border-gray-100 min-h-[400px] w-full">
      <div className="w-full flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Berry Rush</h2>
          <p className="text-gray-500 text-sm">Tap to jump, avoid obstacles.</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="bg-[#fff5e6] text-[#e6953d] px-3 py-1.5 rounded-xl font-bold text-lg flex items-center gap-1">
            <Coins size={18} /> {score}
          </div>
          <span className="text-xs text-gray-400 mt-1">100 pts = 1 Berry</span>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="w-full relative rounded-2xl overflow-hidden shadow-inner bg-gradient-to-b from-[#e0f2fe] to-[#bae6fd]"
        style={{ height: '300px', touchAction: 'none' }}
        onPointerDown={(e) => {
          e.preventDefault();
          handleTap();
        }}
      >
        <canvas 
          ref={canvasRef}
          className="w-full h-full block cursor-pointer"
        />
        
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-6 text-center z-10">
             <button 
               onPointerDown={(e) => {
                 e.stopPropagation();
                 startGame(e as any);
               }}
               onClick={(e) => e.stopPropagation()}
               className="bg-[#4c203b] text-white px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-2 shadow-xl hover:scale-105 transition-transform"
             >
               <Play size={20} /> Play (2 Berry)
             </button>
          </div>
        )}
      </div>
    </div>
  );
};
