import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Coins } from 'lucide-react';
import { UserProfile } from '../../types';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

interface BerryRushProps {
  userProfile: UserProfile;
  updateBerries: (amount: number) => void;
  showToast: (title: string, message: string) => void;
}

export const BerryRush: React.FC<BerryRushProps> = ({ userProfile, updateBerries, showToast }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [highScores, setHighScores] = useState<{score: number, userId: string}[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const audioCtx = useRef<window.AudioContext | null>(null);
  
  // Game state vars (avoiding re-renders for game loop)
  const gameState = useRef({
    playerY: 100,
    velocity: 0,
    gravity: 0.6,
    jump: -9,
    berries: [] as {x: number, y: number}[],
    obstacles: [] as {x: number, width: number, y: number, height: number}[],
    gameSpeed: 4,
    bgOffset: 0,
    frameCount: 0,
    score: 0,
    isGameOver: false,
    sessionId: null as string | null
  });

  const fetchHighScores = async () => {
    try {
      const q = query(collection(db, 'gameSessions'), where('game', '==', 'BerryRush'), orderBy('score', 'desc'), limit(5));
      const snaps = await getDocs(q);
      const scores = snaps.docs.map(doc => ({ score: doc.data().score, userId: doc.data().userId }));
      setHighScores(scores);
    } catch (e) {
      console.warn("Failed to fetch high scores, maybe missing index:", e);
    }
  };

  useEffect(() => {
    fetchHighScores();
  }, []);

  const initAudio = () => {
    if (!audioCtx.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        audioCtx.current = new AudioContext();
      }
    }
    if (audioCtx.current && audioCtx.current.state === 'suspended') {
      audioCtx.current.resume();
    }
  };

  const playJumpSound = () => {
    if (!audioCtx.current) return;
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, audioCtx.current.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.current.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.current.currentTime + 0.1);
  };

  const playCollectSound = () => {
    if (!audioCtx.current) return;
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, audioCtx.current.currentTime);
    osc.frequency.setValueAtTime(1200, audioCtx.current.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, audioCtx.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.current.currentTime + 0.1);
  };

  const playCrashSound = () => {
    if (!audioCtx.current) return;
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, audioCtx.current.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, audioCtx.current.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, audioCtx.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.current.currentTime + 0.3);
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, offset: number) => {
    // Parallax mountains
    ctx.fillStyle = '#7dd3fc'; // sky
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#38bdf8'; // distant mountains
    for (let i = 0; i < width * 2; i += 200) {
      const x = (i - (offset * 0.2)) % (width * 2);
      ctx.beginPath();
      ctx.moveTo(x - 200, height);
      ctx.lineTo(x, height - 100);
      ctx.lineTo(x + 200, height);
      ctx.fill();
    }
  };

  const initGame = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width || 400;
    canvas.height = rect.height || 300;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(ctx, canvas.width, canvas.height, 0);

    // Draw ground
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    
    // Draw player idle
    ctx.font = '24px Arial';
    ctx.fillText('🏃', 50, 118);
  }, []);

  useEffect(() => {
    initGame();
    window.addEventListener('resize', initGame);
    return () => window.removeEventListener('resize', initGame);
  }, [initGame]);

  const startGame = async (e: React.MouseEvent) => {
    e.stopPropagation();
    initAudio();
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

    const startSpeed = difficulty === 'Easy' ? 4 : difficulty === 'Medium' ? 5 : 7;
    const gravity = difficulty === 'Hard' ? 0.7 : 0.6;
    const jump = difficulty === 'Hard' ? -10 : -9;

    gameState.current = {
      playerY: canvas.height / 2,
      velocity: 0,
      gravity: gravity,
      jump: jump,
      berries: [],
      obstacles: [],
      gameSpeed: startSpeed,
      bgOffset: 0,
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
    initAudio();
    if (isPlaying && !gameState.current.isGameOver) {
      gameState.current.velocity = gameState.current.jump;
      playJumpSound();
    }
  };

  const gameOver = useCallback(async () => {
    playCrashSound();
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
      fetchHighScores();
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
    state.bgOffset += state.gameSpeed;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(ctx, canvas.width, canvas.height, state.bgOffset);

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
    const obstacleSpawnRate = difficulty === 'Easy' ? 120 : difficulty === 'Medium' ? 90 : 60;
    if (state.frameCount % obstacleSpawnRate === 0) {
      const h = Math.random() * 80 + 40;
      const isTop = Math.random() > 0.5;
      state.obstacles.push({
        x: canvas.width,
        y: isTop ? 0 : canvas.height - h,
        width: 40,
        height: h
      });
    }
    const berrySpawnRate = difficulty === 'Easy' ? 40 : difficulty === 'Medium' ? 50 : 70;
    if (state.frameCount % berrySpawnRate === 0) {
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
    ctx.font = '30px Arial';
    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const obs = state.obstacles[i];
      obs.x -= state.gameSpeed;
      // We will draw a rock/tree emoji instead of a block, repeated if large
      ctx.fillStyle = '#1e293b';
      // Fallback rect
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
    ctx.font = '20px Arial';
    for (let i = state.berries.length - 1; i >= 0; i--) {
      const berry = state.berries[i];
      berry.x -= state.gameSpeed;
      
      ctx.fillText('🍓', berry.x, berry.y + 15);
      
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
        playCollectSound();
      } else if (berry.x + 20 < 0) {
        state.berries.splice(i, 1);
      }
    }

    // Draw player
    ctx.font = '24px Arial';
    ctx.fillText('🏃', 50, state.playerY + 18);

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
      <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Berry Rush</h2>
          <p className="text-gray-500 text-sm">Tap to jump, avoid obstacles.</p>
        </div>
        {!isPlaying && (
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['Easy', 'Medium', 'Hard'] as const).map(level => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${difficulty === level ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {level}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col md:items-end">
          <div className="bg-[#fff5e6] text-[#e6953d] px-3 py-1.5 rounded-xl font-bold text-lg flex items-center gap-1">
            <Coins size={18} /> {score}
          </div>
          <span className="text-xs text-gray-400 mt-1">100 pts = 1 Berry</span>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="w-full relative rounded-2xl overflow-hidden shadow-inner touch-none"
        style={{ height: '300px', backgroundImage: 'linear-gradient(to bottom, #7dd3fc, #bae6fd)' }}
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
      {/* High Scores Section */}
      {!isPlaying && highScores.length > 0 && (
        <div className="w-full mt-6 bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Top Scores</h3>
          <div className="flex flex-col gap-2">
            {highScores.map((hs, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">{i + 1}. {hs.userId === userProfile.uid ? 'You' : 'Player'}</span>
                <span className="font-bold text-gray-900">{hs.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
