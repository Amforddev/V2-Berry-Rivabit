import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, ClipboardList, User, Coins, Wifi, CheckCircle2, Wallet, Layers, CreditCard, MessageSquare, ArrowDown, AlertCircle, Gamepad2, Trophy } from 'lucide-react';
import { doc, onSnapshot, collection, query, where, addDoc, serverTimestamp, updateDoc, increment, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';

import { View, Survey, RewardOption, UserProfile, SurveySubmission, Redemption, AppNotification } from './types';
import HomeView from './views/HomeView';
import SurveysView from './views/SurveysView';
import ActiveSurveyView from './views/ActiveSurveyView';
import RewardsView from './views/RewardsView';
import ProfileView from './views/ProfileView';
import { OnboardingView } from './views/OnboardingView';
import { ProfileBuilderView } from './views/ProfileBuilderView';
import { WalletView } from './views/WalletView';
import { GamesView } from './views/GamesView';
import { SplashScreen } from './components/SplashScreen';
import { TIER_DEFINITIONS } from './tiers';
import confetti from 'canvas-confetti';
import logo2Img from './assets/logo2.png';
import rewardsImg from './assets/rewards.png';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState<View>('onboarding');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  
  const [submissions, setSubmissions] = useState<SurveySubmission[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [toast, setToast] = useState<{title: string, message: string, type?: 'success'|'error'} | null>(null);

  // Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Tier Up State
  const prevTierRef = useRef<number | null>(null);
  const [showTierUp, setShowTierUp] = useState<number | null>(null);

  // Flying Coins State
  const [flyingCoins, setFlyingCoins] = useState<{ id: number, x: number, y: number }[]>([]);
  const prevBerryRef = useRef(0);

  useEffect(() => {
    if (userProfile && userProfile.tier) {
      if (prevTierRef.current !== null && userProfile.tier > prevTierRef.current) {
        setShowTierUp(userProfile.tier);
      }
      prevTierRef.current = userProfile.tier;
    }
  }, [userProfile]);

  // Pull to refresh State
  const [refreshing, setRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const pullStartY = useRef(0);

  const MOCK_UID = 'ui-demo-user-v2';

  const activeProfile = userProfile || {
    uid: user?.uid || MOCK_UID,
    email: user?.email || 'demo@example.com',
    displayName: user?.displayName || 'Demo User',
    photoURL: user?.photoURL || '',
    berry: 0,
    walletBalance: 0,
    referralCode: (user?.uid || MOCK_UID).substring(0, 8).toUpperCase(),
    createdAt: null as any
  };

  const showToast = (title: string, message: string, type: 'success'|'error' = 'success') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      // If the user signed in with real Firebase auth, redirect to home
      if (firebaseUser) {
        if (view === 'onboarding') setView('home');
      }
      setLoading(false);
    });

    return () => unsubAuth();
  }, [view]);

  useEffect(() => {
    const userId = user?.uid || MOCK_UID;
    const userRef = doc(db, 'users', userId);

    const unsubProfile = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        
        // Streak Logic Verification (once per session/load)
        const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        let shouldUpdate = false;
        let newStreak = data.currentStreak || 0;
        let newLastActive = data.lastActiveDate || "";
        const allTime = data.allTimeBerryEarned || data.berry || 0;
        
        if (!newLastActive) {
          // First time active tracking
          newLastActive = todayStr;
          newStreak = 1;
          shouldUpdate = true;
        } else if (newLastActive !== todayStr) {
          const lastDate = new Date(newLastActive);
          const today = new Date(todayStr);
          const diffDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDiff === 1) {
            newStreak += 1;
            newLastActive = todayStr;
            shouldUpdate = true;
          } else if (diffDiff >= 2) {
            newStreak = 0; // Or 1 if we count today as the start of a new? Let's say 0, then activity today makes it 1. Or reset to 1. "If 2+ days ago -> currentStreak = 0, lastActiveDate = today". Wait, if we count simply opening the app today as activity... wait, user specs: "A streak day = at least 1 survey completed or 1 activity performed that day". So simply opening the app does NOT reset/increase streak immediately unless they perform an action?
            // "If yesterday → currentStreak += 1, update lastActiveDate" => Oh, wait! The spec says:
            // "On every app open: compare today's date to lastActiveDate... If 2+ days ago -> currentStreak = 0, lastActiveDate = today"
            
            newStreak = 0;
            newLastActive = todayStr;
            shouldUpdate = true;
          }
        }

        // Calculate Tier (just to keep synced)
        let tier = 1;
        const TIER_DEFS = {
          1: { minBerry: 0, streakRequired: 0 },
          2: { minBerry: 1000, streakRequired: 7 },
          3: { minBerry: 5000, streakRequired: 14 },
          4: { minBerry: 15000, streakRequired: 30 },
          5: { minBerry: 50000, streakRequired: 60 }
        };
        for (let i = 5; i >= 1; i--) {
          const def = TIER_DEFS[i as keyof typeof TIER_DEFS];
          if (allTime >= def.minBerry && newStreak >= def.streakRequired) {
            tier = i;
            break;
          }
        }

        if (data.tier !== tier) {
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          try {
            await updateDoc(userRef, { currentStreak: newStreak, lastActiveDate: newLastActive, tier, allTimeBerryEarned: allTime });
          } catch(e) {}
        }

        setUserProfile({ ...data, currentStreak: newStreak, lastActiveDate: newLastActive, tier, allTimeBerryEarned: allTime });
        setInitError(null);
      } else {
        try {
          const newReferralCode = userId.substring(0, 8).toUpperCase();
          await setDoc(userRef, {
            uid: userId,
            email: user?.email || 'demo@example.com',
            displayName: user?.displayName || 'Demo User',
            photoURL: user?.photoURL || '',
            berry: 1000000,
            walletBalance: 0,
            referralCode: newReferralCode,
            referralCount: 0,
            kycVerified: false,
            profileCompleted: false,
            createdAt: serverTimestamp(),
          });
        } catch (e) {
          console.error("Error creating user profile:", e);
        }
      }
    }, (err) => {
      console.error("Profile snapshot error:", err);
      // For UI-only demo, don't block the app with connection errors
      // Just log it and let the app use fallback data
      if (err.message.includes('offline') || err.message.includes('unavailable')) {
        console.warn("Firestore is unavailable, running in offline/mock mode.");
      } else {
        setInitError("Database error: " + err.message);
      }
    });

    const qSub = query(collection(db, 'surveySubmissions'), where('userId', '==', userId));
    const unsubSub = onSnapshot(qSub, (snap) => {
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as SurveySubmission)));
    }, (err) => console.error("Submissions error:", err));

    const qRed = query(collection(db, 'redemptions'), where('userId', '==', userId));
    const unsubRed = onSnapshot(qRed, (snap) => {
      setRedemptions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Redemption)));
    }, (err) => console.error("Redemptions error:", err));

    const qNotif = query(collection(db, 'notifications'), where('userId', '==', userId));
    const unsubNotif = onSnapshot(qNotif, (snap) => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      notifs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setNotifications(notifs);
    }, (err) => console.error("Notifications error:", err));

    return () => {
      unsubProfile();
      unsubSub();
      unsubRed();
      unsubNotif();
    };
  }, [user]);

  // Coin Animation Effect
  useEffect(() => {
    if (activeProfile.berry > prevBerryRef.current && prevBerryRef.current > 0) {
      const diff = Math.min(activeProfile.berry - prevBerryRef.current, 10);
      
      const newCoins = Array.from({length: diff}).map((_, i) => ({
        id: Date.now() + i,
        x: window.innerWidth / 2 + (Math.random() * 60 - 30),
        y: window.innerHeight / 2 + (Math.random() * 60 - 30)
      }));
      setFlyingCoins(prev => [...prev, ...newCoins]);
      setTimeout(() => {
        setFlyingCoins(prev => prev.filter(c => !newCoins.find(nc => nc.id === c.id)));
      }, 1500);
    }
    prevBerryRef.current = activeProfile.berry;
  }, [activeProfile.berry]);

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const mainEl = document.getElementById('main-scroll-container');
    if (mainEl && mainEl.scrollTop <= 0) {
      pullStartY.current = e.touches[0].clientY;
    } else {
      pullStartY.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY.current > 0 && !refreshing) {
      const y = e.touches[0].clientY;
      const diff = y - pullStartY.current;
      if (diff > 0) {
        setPullY(Math.min(diff * 0.4, 80));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullY > 60 && !refreshing) {
      setRefreshing(true);
      setTimeout(() => {
        setRefreshing(false);
        setPullY(0);
        showToast('Refreshed!', 'You are up to date.', 'success');
      }, 1200);
    } else {
      setPullY(0);
    }
    pullStartY.current = 0;
  };

  // Tutorial Effect
  useEffect(() => {
    if (!loading && user && view === 'home' && !showSplash) {
      const hasSeenTutorial = localStorage.getItem('tutorialCompleted');
      if (!hasSeenTutorial) {
        const timer = setTimeout(() => {
          setShowTutorial(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, user, view, showSplash]);

  const tutorialSteps = [
    {
      title: "Welcome to berry! 🍓",
      content: "Let's take a quick tour to help you get started.",
      placement: "center"
    },
    {
      title: "Answer & Earn",
      content: "Take surveys and complete profiling to earn berries.",
      placement: "nav-answer"
    },
    {
      title: "Claim Rewards",
      content: "Redeem your hard-earned berries for amazing prizes and cash.",
      placement: "nav-rewards"
    },
    {
      title: "Your Wallet",
      content: "Track your cash, manage your earnings, and make withdrawals.",
      placement: "nav-wallet"
    }
  ];

  const completeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('tutorialCompleted', 'true');
  };

  const nextTutorialStep = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(prev => prev + 1);
    } else {
      completeTutorial();
    }
  };

  const updateBerries = async (amount: number) => {
    if (!activeProfile) return;
    try {
      const updates: any = { berry: increment(amount) };
      if (amount > 0) {
        updates.allTimeBerryEarned = increment(amount);
      }
      await updateDoc(doc(db, 'users', activeProfile.uid), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  const startSurvey = (survey: Survey) => {
    setActiveSurvey(survey);
    setView('survey_active');
  };

  const finishSurvey = async (berryEarned: number, surveyId: string) => {
    const userId = activeProfile.uid;
    try {
      await addDoc(collection(db, 'surveySubmissions'), {
        userId,
        surveyId,
        berryEarned,
        submittedAt: serverTimestamp()
      });

      const updates: any = { berry: increment(berryEarned) };
      if (berryEarned > 0) {
        updates.allTimeBerryEarned = increment(berryEarned);
      }

      await updateDoc(doc(db, 'users', userId), updates);

      setActiveSurvey(null);
      setView('home');
      showToast('Survey Completed!', `You earned ${berryEarned} Berry.`, 'success');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'surveySubmissions');
      showToast('Error', 'Failed to submit survey. Please try again.', 'error');
    }
  };

  const redeemReward = async (option: RewardOption, details?: any) => {
    const userId = activeProfile.uid;
    if (activeProfile.berry >= option.cost) {
      try {
        if (details && Object.keys(details).length > 0) {
          await updateDoc(doc(db, 'users', userId), details);
        }

        await addDoc(collection(db, 'redemptions'), {
          userId,
          rewardId: option.id,
          rewardTitle: option.title,
          cost: option.cost,
          redeemedAt: serverTimestamp(),
          status: 'pending'
        });

        const updates: any = {
          berry: increment(-option.cost)
        };
        
        if (option.id.startsWith('charity')) {
          const donatedNgn = option.cost * 0.015;
          await addDoc(collection(db, 'charityDonations'), {
            userId,
            ngoTitle: option.title,
            berryDonated: option.cost,
            ngnDonated: donatedNgn,
            donatedAt: serverTimestamp()
          });
        } else if (option.id.startsWith('c')) {
           const amount = option.id === 'c1' ? 1000 : option.id === 'c2' ? 5000 : 0;
           updates.walletBalance = increment(amount);
        }

        await updateDoc(doc(db, 'users', userId), updates);

        await addDoc(collection(db, 'notifications'), {
          userId,
          title: 'Redemption Successful',
          message: `You redeemed ${option.title} for ${option.cost} Berry.`,
          read: false,
          createdAt: serverTimestamp(),
          type: 'redemption'
        });

        showToast('Redemption Successful!', `You redeemed ${option.title}.`, 'success');
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, 'redemptions');
        showToast('Error', 'Reward redemption failed. Try again later.', 'error');
      }
    } else {
      showToast('Not enough Berry', `You need ${option.cost - activeProfile.berry} more Berry.`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1115] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-white font-bold uppercase tracking-widest animate-pulse">Initializing berry...</p>
      </div>
    );
  }

  if (initError && !userProfile) {
    return (
      <div className="min-h-screen bg-[#0F1115] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-[2rem] border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(30,36,45,1)] max-w-sm">
          <div className="w-16 h-16 bg-secondary rounded-2xl border-4 border-gray-900 flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(30,36,45,1)]">
            <Wifi size={32} className="text-gray-900" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase mb-4 leading-tight">Connection Issue</h2>
          <p className="text-gray-600 font-bold mb-8">{initError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-secondary py-4 rounded-2xl border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(30,36,45,1)] font-black uppercase text-gray-900 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const completedSurveyIds = submissions.map(s => s.surveyId);

  return (
    <div className="min-h-screen bg-[#fbf9ee] font-sans flex flex-col relative overflow-hidden">
        
        {showSplash && (
          <div className="absolute inset-0 z-[100]">
            <SplashScreen onFinish={() => setShowSplash(false)} />
          </div>
        )}

        {view === 'onboarding' ? (
          <OnboardingView setView={setView} />
        ) : (
          <>
            {/* Flying Coins Overlay */}
            <AnimatePresence>
              {flyingCoins.map(coin => (
                <motion.div
                  key={coin.id}
                  initial={{ x: coin.x, y: coin.y, scale: 0, opacity: 0 }}
                  animate={{
                    x: [coin.x, coin.x + (Math.random() * 100 - 50), window.innerWidth - 60],
                    y: [coin.y, coin.y - 150, 40],
                    scale: [0, 1.5, 0.5],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  className="fixed z-[1000] pointer-events-none text-[#F1B347]"
                >
                  <Coins size={36} className="fill-[#F5CD82] drop-shadow-lg" />
                </motion.div>
              ))}
            </AnimatePresence>

            {view !== 'survey_active' && view !== 'profile-builder' && (
              <header className="bg-[#fbf9ee] px-6 py-2 flex justify-between items-center z-10 relative max-w-md mx-auto w-full">
                <div className="flex items-center gap-2">
                  <img src={logo2Img} alt="berry Logo" className="w-8 h-8 rounded-lg object-contain" referrerPolicy="no-referrer" />
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">berry</h1>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Hello, {activeProfile.displayName?.split(' ')[0] || 'User'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setView('wallet')}
                    className="flex items-center gap-1 bg-white border border-gray-100 px-3 py-1.5 rounded-full text-gray-900 font-bold text-xs shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    <Wallet size={14} className="text-primary" />
                    <span>₦{activeProfile.walletBalance?.toLocaleString() || '0'}</span>
                  </button>
                  <motion.div 
                    key={activeProfile.berry}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1 bg-white border border-gray-100 px-3 py-1.5 rounded-full text-gray-900 font-bold text-xs shadow-sm"
                  >
                    <Coins size={14} className="text-primary" />
                    <span>{activeProfile.berry?.toLocaleString() || '0'}</span>
                  </motion.div>
                </div>
              </header>
            )}

            <main 
              id="main-scroll-container"
              className="flex-1 overflow-y-auto relative bg-[#fbf9ee] pb-24 scrollbar-hide max-w-md mx-auto w-full"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Pull To Refresh Indicator */}
              <div 
                className="absolute top-0 left-0 right-0 flex justify-center items-end pointer-events-none z-50 transition-transform"
                style={{ height: 60, transform: `translateY(${pullY - 60}px)` }}
              >
                <div className="bg-white rounded-full p-2 shadow-md border border-gray-100 flex items-center justify-center text-primary">
                  {refreshing ? (
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowDown 
                      size={20} 
                      className="text-gray-400" 
                      style={{ transform: `rotate(${Math.min(pullY * 3, 180)}deg)` }} 
                    />
                  )}
                </div>
              </div>

              <motion.div 
                className="h-full"
                animate={{ y: refreshing ? 60 : pullY }}
                transition={refreshing ? { type: 'spring', stiffness: 300, damping: 20 } : { type: 'tween', duration: 0 }}
              >
                <AnimatePresence mode="wait">
                  {view === 'home' && (
                    <HomeView 
                      key="home" 
                      userProfile={activeProfile}
                      startSurvey={startSurvey} 
                      completedSurveys={completedSurveyIds}
                      setView={setView}
                    />
                  )}
                  {view === 'surveys' && (
                    <SurveysView 
                      key="surveys" 
                      userProfile={activeProfile}
                      startSurvey={startSurvey} 
                      completedSurveys={completedSurveyIds} 
                      setView={setView}
                    />
                  )}
                  {view === 'wallet' && (
                    <WalletView 
                      key="wallet" 
                      userProfile={activeProfile}
                      setUserProfile={setUserProfile as any}
                    />
                  )}
                  {view === 'games' && (
                    <GamesView 
                      key="games" 
                      userProfile={activeProfile}
                      updateBerries={updateBerries}
                      redemptions={redemptions}
                      showToast={showToast}
                      setView={setView}
                    />
                  )}
                  {view === 'survey_active' && activeSurvey && (
                    <ActiveSurveyView 
                      key="survey_active" 
                      survey={activeSurvey} 
                      onFinish={finishSurvey} 
                      onCancel={() => setView('home')} 
                    />
                  )}
                  {view === 'rewards' && (
                    <RewardsView 
                      key="rewards" 
                      userProfile={activeProfile} 
                      redeemReward={redeemReward} 
                      redemptions={redemptions}
                      showToast={showToast}
                    />
                  )}
                  {view === 'profile' && (
                    <ProfileView 
                      key="profile" 
                      userProfile={activeProfile}
                      redemptions={redemptions}
                      submissions={submissions}
                      showToast={showToast}
                      setView={setView}
                    />
                  )}
                  {view === 'profile-builder' && (
                    <ProfileBuilderView 
                      setView={setView} 
                      userProfile={activeProfile} 
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            </main>

            {/* Nav Bar only visible when not in onboarding/survey */}
            {view !== 'onboarding' && view !== 'survey_active' && (
              <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] px-2 py-1.5 flex justify-between items-center z-20 rounded-[2rem] border border-gray-50">
                <div className="flex flex-1 justify-around items-center">
                  <NavItem icon={Home} label="Home" isActive={view === 'home'} onClick={() => setView('home')} />
                  <NavItem icon={ClipboardList} label="Answer" isActive={view === 'surveys'} onClick={() => setView('surveys')} />
                </div>
                
                <ProminentNavItem isActive={view === 'rewards'} onClick={() => setView('rewards')} />
                
                <div className="flex flex-1 justify-around items-center">
                  <NavItem icon={Gamepad2} label="Games" isActive={view === 'games'} onClick={() => setView('games')} />
                  <NavItem icon={User} label="Profile" isActive={view === 'profile'} onClick={() => setView('profile')} />
                </div>
              </nav>
            )}
          </>
        )}

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 20, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white text-gray-900 p-4 rounded-2xl shadow-lg z-50 flex items-start gap-3 border border-gray-100"
            >
              <div className={`p-2 rounded-full ${toast.type === 'error' ? 'bg-red-100 text-red-500' : 'bg-secondary/20 text-primary'}`}>
                {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div>
                <h4 className="font-bold text-sm">{toast.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">{toast.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tier Up Modal */}
        {showTierUp && (
          <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className={`bg-white rounded-3xl p-8 max-w-sm w-full relative overflow-hidden border-4 ${(TIER_DEFINITIONS[showTierUp as keyof typeof TIER_DEFINITIONS] || {}).border} shadow-2xl flex flex-col items-center text-center`}
            >
              {(function() {
                // Fire confetti when rendering
                confetti({
                  particleCount: 150,
                  spread: 80,
                  origin: { y: 0.6 },
                  colors: ['#00A082', '#F68B1E', '#FFCC00']
                });
                return null;
              })()}
              
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${(TIER_DEFINITIONS[showTierUp as keyof typeof TIER_DEFINITIONS] || {}).bg} ${(TIER_DEFINITIONS[showTierUp as keyof typeof TIER_DEFINITIONS] || {}).color}`}>
                <Trophy size={48} />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">Level Up!</h3>
              <p className="text-gray-600 mt-2 font-medium">You reached <span className={`font-bold ${(TIER_DEFINITIONS[showTierUp as keyof typeof TIER_DEFINITIONS] || {}).color}`}>{(TIER_DEFINITIONS[showTierUp as keyof typeof TIER_DEFINITIONS] || {name: ''}).name} Tier</span></p>
              
              <button 
                onClick={() => setShowTierUp(null)}
                className="mt-8 w-full bg-gray-900 text-white font-bold py-4 rounded-xl active:scale-95 transition-transform"
              >
                Continue
              </button>
            </motion.div>
          </div>
        )}

        {/* Tutorial Overlay */}
        <AnimatePresence>
          {showTutorial && (
            <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="absolute inset-0 max-w-md mx-auto pointer-events-none flex items-center justify-center">
                <motion.div
                  key={tutorialStep}
                  className={`absolute bg-white text-gray-900 p-6 rounded-3xl shadow-2xl w-[90%] pointer-events-auto border-2 border-primary/20 ${
                    tutorialSteps[tutorialStep].placement === 'center' ? 'top-1/3 left-1/2 -translate-x-1/2' :
                    tutorialSteps[tutorialStep].placement === 'nav-answer' ? 'bottom-[100px] left-8' :
                    tutorialSteps[tutorialStep].placement === 'nav-rewards' ? 'bottom-[120px] left-1/2 -translate-x-1/2' :
                    tutorialSteps[tutorialStep].placement === 'nav-wallet' ? 'bottom-[100px] right-8' : ''
                  }`}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                >
                  {/* Arrow Pointers */}
                  {tutorialSteps[tutorialStep].placement === 'nav-answer' && (
                    <div className="absolute -bottom-3 left-[15%] w-6 h-6 bg-white rotate-45 border-b-2 border-r-2 border-primary/20"></div>
                  )}
                  {tutorialSteps[tutorialStep].placement === 'nav-rewards' && (
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white rotate-45 border-b-2 border-r-2 border-primary/20"></div>
                  )}
                  {tutorialSteps[tutorialStep].placement === 'nav-wallet' && (
                    <div className="absolute -bottom-3 right-[15%] w-6 h-6 bg-white rotate-45 border-b-2 border-r-2 border-primary/20"></div>
                  )}

                  <h3 className="font-black text-xl mb-3 text-primary">{tutorialSteps[tutorialStep].title}</h3>
                  <p className="text-sm text-gray-600 mb-8 font-medium leading-relaxed">
                    {tutorialSteps[tutorialStep].content}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {tutorialSteps.map((_, idx) => (
                        <div 
                          key={idx} 
                          className={`h-2 rounded-full transition-all ${idx === tutorialStep ? 'w-6 bg-primary' : 'w-2 bg-gray-200'}`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-4 items-center">
                      <button onClick={completeTutorial} className="text-gray-400 text-sm font-bold hover:text-gray-600 transition-colors">
                        Skip
                      </button>
                      <button 
                        onClick={nextTutorialStep}
                        className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-[0_4px_14px_0_rgba(202,63,115,0.39)] hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
                      >
                        {tutorialStep === tutorialSteps.length - 1 ? 'Got it!' : 'Next'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>

    </div>
  );
}

function NavItem({ icon: Icon, label, isActive, onClick, badge }: { icon: React.ElementType, label: string, isActive: boolean, onClick: () => void, badge?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-1 transition-all px-3 py-2 z-10 ${isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {isActive && (
        <motion.div
          layoutId="nav_active_bg"
          className="absolute inset-0 bg-primary/10 rounded-2xl -z-10"
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        />
      )}
      <motion.div 
        animate={isActive ? { y: -2, scale: 1.1 } : { y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className="relative"
      >
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} fill={isActive ? "currentColor" : "none"} className={isActive ? "drop-shadow-[0_2px_4px_rgba(202,63,115,0.3)]" : ""} />
        {badge && (
          <div className="absolute -top-1 -right-2 bg-[#E15A5A] text-white text-[8px] font-bold px-1.5 rounded-md min-w-[16px] h-[14px] flex items-center justify-center border border-white">
            {badge}
          </div>
        )}
      </motion.div>
      <motion.span 
        animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0.8, scale: 0.95 }}
        className={`text-[10px] font-bold ${isActive ? 'text-primary' : 'text-gray-500'}`}
      >
        {label}
      </motion.span>
    </button>
  );
}

function ProminentNavItem({ isActive, onClick }: { isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="relative -top-5 flex flex-col items-center gap-1 group"
    >
      <div className={`w-[60px] h-[60px] rounded-full bg-white border-2 ${isActive ? 'border-accent' : 'border-gray-100'} p-1 shadow-lg flex items-center justify-center transition-all active:scale-95 group-hover:shadow-xl`}>
        <div className="w-full h-full rounded-full bg-gradient-to-br from-[#FDECF2] via-[#E0C3FC] to-[#FDECF2] flex items-center justify-center overflow-hidden relative">
           {/* Holographic effect simulation */}
           <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-[radial-gradient(circle_at_center,_#fff_0%,_transparent_70%)] animate-pulse" />
           <img 
             src={rewardsImg} 
             alt="Rewards" 
             className={`w-11 h-11 object-contain transition-all ${isActive ? 'scale-110' : 'grayscale opacity-70'}`}
             referrerPolicy="no-referrer"
           />
        </div>
      </div>
      <span className={`text-[10px] font-bold ${isActive ? 'text-primary' : 'text-gray-500'}`}>Rewards</span>
    </button>
  );
}

