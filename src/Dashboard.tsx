import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  increment,
  getDocs,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { useAuth } from './AuthContext';
import { Trade, TradeResult, Emotion, Duration, UserProfile, AssetType } from './types';
import { TRADING_PAIRS } from './constants';
import { Card, Button, Input, Modal, cn } from './components/UI';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Trophy, 
  Target, 
  History, 
  Settings, 
  LogOut,
  ChevronRight,
  Smile,
  Frown,
  Zap,
  Shield,
  ShieldAlert,
  BarChart3,
  BookOpen,
  Users,
  MessageCircle,
  Search,
  ChevronDown,
  CheckCircle2,
  Star,
  Crown,
  Brain,
  Sparkles,
  Lightbulb
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

import { isSameDay } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [topScore, setTopScore] = useState<number>(0);
  const [aiAdvice, setAiAdvice] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Fetch Real Rank ---
  useEffect(() => {
    if (!profile?.uid) return;

    const fetchRank = async () => {
      try {
        const usersRef = collection(db, 'users_public');
        const qRank = query(usersRef, where('totalScore', '>', profile.totalScore || 0));
        const snapshot = await getDocs(qRank);
        setUserRank(snapshot.size + 1);

        const qTop = query(usersRef, orderBy('totalScore', 'desc'), limit(1));
        const topSnap = await getDocs(qTop);
        if (!topSnap.empty) {
          setTopScore(topSnap.docs[0].data().totalScore || 0);
        }
      } catch (err) {
        console.error("Error fetching rank:", err);
      }
    };

    fetchRank();
  }, [profile?.totalScore, profile?.uid]);

  // --- AI Advice Logic ---
  const fetchAiAdvice = async () => {
    if (!profile) return;
    setIsAiLoading(true);
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      
      const prompt = `
        You are a strict but emotional Trading Mentor. 
        User's current stats:
        - Score: ${profile.totalScore}
        - Streak: ${profile.streak}
        - Level: ${profile.level}
        - Recent Trades: ${trades.slice(0, 3).map(t => `${t.result} (${t.emotion})`).join(', ')}

        Give a very short, emotional, and punchy advice in Hinglish (Hindi + English).
        Focus on discipline and psychology. Max 15 words.
        Example: "Bhai, greed mat kar. Setup ka wait kar, tabhi entry le!"
      `;

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      setAiAdvice(response.text || "Keep your discipline high, trader.");
    } catch (err) {
      console.error("AI Advice error:", err);
      setAiAdvice("Market is volatile. Stay disciplined.");
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (trades.length > 0 && !aiAdvice) {
      fetchAiAdvice();
    }
  }, [trades.length]);

  // Check if it's user's first time to show tutorial
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (profile && !hasSeenTutorial) {
      setIsTutorialOpen(true);
      localStorage.setItem('hasSeenTutorial', 'true');
    }
  }, [profile]);

  // Trade form state
  const [assetType, setAssetType] = useState<AssetType>('Currency');
  const [pair, setPair] = useState('');
  const [tradeAmount, setTradeAmount] = useState('');
  const [percentage, setPercentage] = useState('');
  const [result, setResult] = useState<TradeResult>('Win');
  const [emotion, setEmotion] = useState<Emotion>('Calm');
  const [ruleFollowed, setRuleFollowed] = useState(true);
  const [duration, setDuration] = useState<Duration>('5m');
  const [pairSearch, setPairSearch] = useState('');
  const [isPairListOpen, setIsPairListOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const tradesRef = collection(db, 'users', user.uid, 'trades');
    const q = query(tradesRef, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Trades snapshot received:", snapshot.size, "docs");
      const tradesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade));
      setTrades(tradesData);
    }, (error) => {
      console.error("Trades snapshot error:", error);
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/trades`);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      setError("User profile not loaded. Please wait.");
      return;
    }

    if (dailyPnLPercent <= -5) {
      setError("🚫 Daily Stop Loss (5%) hit! You should stop trading for today to protect your capital.");
      setLoading(false);
      return;
    }

    // Pro Risk Limits
    if (profile?.isPro && profile?.riskLimits) {
      const { maxDailyLoss, maxTradesPerDay, maxRiskPerTrade } = profile.riskLimits;
      
      // Check max daily loss
      if (Math.abs(dailyPnL) >= maxDailyLoss && dailyPnL < 0) {
        setError(`🚫 Max Daily Loss (${currencySymbol}${maxDailyLoss}) hit! Stop trading.`);
        setLoading(false);
        return;
      }

      // Check max trades per day
      const tradesToday = trades.filter(t => isSameDay(t.timestamp?.toDate(), new Date())).length;
      if (tradesToday >= maxTradesPerDay) {
        setError(`🚫 Max Trades Per Day (${maxTradesPerDay}) reached! Stop trading.`);
        setLoading(false);
        return;
      }

      // Check risk per trade
      const amount = parseFloat(tradeAmount) || 0;
      const riskPercent = (amount / (profile.currentCapital || 1)) * 100;
      if (riskPercent > maxRiskPerTrade) {
        setError(`⚠️ Risk per trade (${riskPercent.toFixed(1)}%) exceeds your limit of ${maxRiskPerTrade}%!`);
        setLoading(false);
        return;
      }
    }

    // Focus Mode Check
    if (profile?.isPro && profile?.focusMode) {
      if (!ruleFollowed) {
        setError("🚫 Focus Mode is ACTIVE. You cannot log trades where rules were not followed.");
        setLoading(false);
        return;
      }
      if (['Greed', 'Fear', 'Revenge', 'FOMO'].includes(emotion)) {
        setError(`🚫 Focus Mode is ACTIVE. Emotional trading (${emotion}) is blocked.`);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Attempting to log trade...");
      const scoreChange = ruleFollowed ? 10 : -20;
      const amount = parseFloat(tradeAmount) || 0;
      const percent = parseFloat(percentage) || 0;
      const currentCap = profile.currentCapital || 0;
      
      // Calculate capital change: Win ? (amount * percent/100) : -amount
      const change = result === 'Win' ? (amount * (percent / 100)) : -amount;

      const tradeData: Trade = {
        userId: user.uid,
        assetType,
        pair: pair || 'N/A',
        currentCapital: currentCap,
        tradeAmount: amount,
        percentage: percent,
        result,
        emotion,
        ruleFollowed,
        duration,
        capitalChange: change,
        timestamp: serverTimestamp(),
      };

      console.log("Trade data to save:", tradeData);

      const tradesRef = collection(db, 'users', user.uid, 'trades');
      const tradeDoc = await addDoc(tradesRef, tradeData);
      console.log("Trade document added with ID:", tradeDoc.id);

      // Update user profile
      console.log("Updating user profile...");
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        disciplineScore: increment(scoreChange),
        totalScore: increment(scoreChange),
        currentCapital: increment(change),
        streak: ruleFollowed ? increment(1) : 0,
      }, { merge: true });
      console.log("User profile updated successfully.");

      setIsLogModalOpen(false);
      setTradeAmount('');
      setPercentage('');
      setPair('');
      setPairSearch('');
      setIsPairListOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error logging trade:", err);
      setError(err.message || "Failed to log trade. Please check your connection or permissions.");
    } finally {
      setLoading(false);
    }
  };

  const growthPercent = profile?.startingCapital 
    ? ((profile.currentCapital! - profile.startingCapital) / profile.startingCapital) * 100 
    : 0;

  const maxRiskPerTrade = (profile?.currentCapital || 0) * 0.02;
  const dailyStopLoss = (profile?.currentCapital || 0) * 0.05;
  const dailyTarget = (profile?.currentCapital || 0) * 0.05; // Assuming 5% target

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter(t => {
    if (!t.timestamp) return false;
    const date = t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
    return date.toISOString().split('T')[0] === todayStr;
  });
  const dailyPnL = todayTrades.reduce((acc, t) => acc + t.capitalChange, 0);
  const dailyPnLPercent = (profile?.currentCapital || 0) > 0 ? (dailyPnL / profile!.currentCapital!) * 100 : 0;

  const currencySymbol = profile?.currency === 'INR' ? '₹' : '$';

  const getLevelInfo = () => {
    const score = profile?.totalScore || 0;
    if (score < 500) {
      return { current: 'Beginner', next: 'Intermediate', needed: 500 - score, total: 500 };
    } else if (score < 2000) {
      return { current: 'Intermediate', next: 'Advanced', needed: 2000 - score, total: 2000 };
    } else {
      return { current: 'Advanced', next: 'Legend', needed: 0, total: 5000 };
    }
  };

  const levelInfo = getLevelInfo();

  return (
    <div className="pb-10 pt-6 px-4 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsLevelModalOpen(true)}
            className="w-12 h-12 rounded-2xl bg-profit flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-profit/20 active:scale-95 transition-transform overflow-hidden border border-profit/20"
          >
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              profile?.displayName?.[0] || 'T'
            )}
          </button>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold text-text-main leading-tight">
                {profile?.displayName || 'Trader'}
              </h1>
              {profile?.role === 'verified' && <CheckCircle2 size={16} className="text-primary fill-primary/10" />}
              {(profile?.isPro || profile?.role === 'admin') && (
                <span className="flex items-center gap-0.5 bg-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-sm shadow-primary/20">
                  <Crown size={8} fill="currentColor" /> VIP
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-profit bg-profit/10 px-1.5 py-0.5 rounded-md border border-profit/20">
                {profile?.level || 'Beginner'}
              </span>
              <span className="text-[10px] font-bold text-text-sub uppercase">
                ID: {user?.uid.slice(0, 6)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-border-dark p-1 rounded-2xl">
          <button 
            onClick={() => setIsTutorialOpen(true)}
            className="p-2 bg-card rounded-xl shadow-sm text-text-sub hover:text-profit transition-colors"
          >
            <BookOpen size={18} />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card rounded-xl shadow-sm">
            <Flame size={16} className="text-orange-500 fill-orange-500" />
            <span className="text-sm font-bold text-text-main">{profile?.streak || 0}</span>
          </div>
        </div>
      </div>

      {showSuccess && (
        <div className="bg-profit text-white px-4 py-3 rounded-2xl font-bold text-sm flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
          <span>Trade logged successfully!</span>
          <button onClick={() => setShowSuccess(false)}>✕</button>
        </div>
      )}

      {error && (
        <div className="bg-loss text-white px-4 py-3 rounded-2xl font-bold text-sm flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* AI Mentor Advice - Teaser for non-VIP, Full for VIP */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary" size={20} />
          <h2 className="text-lg font-bold text-text-main">AI Mentor Advice</h2>
        </div>
        <Card className="p-5 bg-primary/5 border-primary/20 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <Brain size={24} />
            </div>
            <div className="space-y-2 flex-1">
              {isAiLoading ? (
                <div className="h-10 flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              ) : (
                <p className="text-sm font-medium text-text-main italic leading-relaxed">
                  "{aiAdvice || "Log your trades to get personalized AI mentoring."}"
                </p>
              )}
              {profile?.isPro && (
                <button 
                  onClick={fetchAiAdvice}
                  className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                >
                  Refresh Advice
                </button>
              )}
            </div>
          </div>
          {!profile?.isPro && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="text-center space-y-2">
                <p className="text-xs font-black text-text-main uppercase tracking-widest">Upgrade to VIP for Real-Time AI Advice</p>
                <Button variant="ghost" className="text-primary font-black text-[10px]" onClick={() => navigate('/pro')}>Unlock Now 👑</Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Leaderboard Preview */}
      <Card 
        onClick={() => navigate('/rank')}
        className="p-4 bg-card border-border-dark flex items-center justify-between cursor-pointer hover:border-primary/40 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform">
            <Trophy size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-sub uppercase tracking-widest">Your Real-Time Rank</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-text-main">#{userRank || '...'}</span>
              <span className="text-xs font-bold text-primary">Top Score: {topScore}</span>
            </div>
          </div>
        </div>
        <ChevronRight size={20} className="text-text-sub group-hover:translate-x-1 transition-transform" />
      </Card>

      {/* Risk Management */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-text-main">Risk Management</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-card border border-border-dark rounded-2xl space-y-1">
            <div className="flex items-center gap-1.5">
              <ShieldAlert size={12} className="text-orange-500" />
              <p className="text-[10px] font-bold text-text-sub uppercase">Max Risk/Trade</p>
            </div>
            <p className="text-sm font-black text-text-main">{currencySymbol}{maxRiskPerTrade.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-[9px] font-bold text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded inline-block">2% Limit</p>
          </div>
          <div className="p-3 bg-card border border-border-dark rounded-2xl space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingDown size={12} className="text-loss" />
              <p className="text-[10px] font-bold text-text-sub uppercase">Daily Stop Loss</p>
            </div>
            <p className="text-sm font-black text-text-main">{currencySymbol}{dailyStopLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-[9px] font-bold text-loss bg-loss/10 px-1.5 py-0.5 rounded inline-block">5% Limit</p>
          </div>
          <div className="p-3 bg-card border border-border-dark rounded-2xl space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={12} className="text-profit" />
              <p className="text-[10px] font-bold text-text-sub uppercase">Daily Target</p>
            </div>
            <p className="text-sm font-black text-text-main">{currencySymbol}{dailyTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-[9px] font-bold text-profit bg-profit/10 px-1.5 py-0.5 rounded inline-block">5% Goal</p>
          </div>
        </div>
      </div>

      {/* VIP Section Entry - Only show to non-VIPs to encourage upgrade */}
      {!(profile?.isPro || profile?.role === 'admin') && (
        <Card 
          onClick={() => navigate('/pro')}
          className="p-4 bg-gradient-to-r from-primary/20 to-primary/5 border-primary/30 cursor-pointer hover:shadow-lg transition-all group overflow-hidden relative"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
            <Crown size={100} />
          </div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                <Crown size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-text-main group-hover:text-primary transition-colors">Unlock VIP Hub 👑</h3>
                <p className="text-xs font-bold text-text-sub uppercase tracking-wider">
                  Access AI Insights & Risk Control
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-background border border-border-dark flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all">
              <ChevronRight size={16} className="group-hover:text-white transition-colors" />
            </div>
          </div>
        </Card>
      )}

      {/* Daily Progress */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-text-main">Daily Progress</h2>
        <Card className={cn(
          "p-5 space-y-4",
          dailyPnL >= 0 ? "bg-profit/10 border-profit/20" : "bg-loss/10 border-loss/20"
        )}>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className={cn("text-xs font-bold uppercase tracking-wider", dailyPnL >= 0 ? "text-profit" : "text-loss")}>
                Today's P&L
              </p>
              <div className="flex items-baseline gap-1">
                <span className={cn("text-2xl font-black", dailyPnL >= 0 ? "text-text-main" : "text-text-main")}>
                  {dailyPnL >= 0 ? '+' : ''}{currencySymbol}{dailyPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={cn("text-xs font-bold", dailyPnL >= 0 ? "text-profit" : "text-loss")}>
                  ({dailyPnLPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
              dailyPnL >= 0 ? "bg-profit shadow-profit/20" : "bg-loss shadow-loss/20"
            )}>
              {dailyPnL >= 0 ? <TrendingUp className="text-white" /> : <TrendingDown className="text-white" />}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className="text-loss">Stop Loss: -5%</span>
              <span className="text-text-sub">Daily Target: +5%</span>
            </div>
            <div className="relative h-3 bg-background rounded-full overflow-hidden">
              {/* Stop Loss Line */}
              <div className="absolute left-0 top-0 bottom-0 bg-loss/20 w-[50%]" />
              {/* Target Line */}
              <div className="absolute right-0 top-0 bottom-0 bg-profit/20 w-[50%]" />
              
              {/* Progress Bar */}
              <div 
                className={cn(
                  "absolute top-0 bottom-0 transition-all duration-1000",
                  dailyPnL >= 0 ? "bg-profit left-1/2" : "bg-loss right-1/2"
                )}
                style={{ 
                  width: `${Math.min(50, Math.abs(dailyPnLPercent) * 10)}%` 
                }}
              />
              
              {/* Center Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border-dark z-10" />
            </div>
            <p className="text-[10px] text-center font-bold text-text-sub">
              {dailyPnLPercent >= 5 
                ? "🎉 Target Achieved! Stop trading for today." 
                : dailyPnLPercent <= -5 
                  ? "⚠️ Stop Loss Hit! Close your terminal." 
                  : "Keep following your rules."}
            </p>
          </div>
        </Card>
      </div>
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-text-main">Progress Report</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-card border border-border-dark rounded-2xl space-y-1">
            <p className="text-[10px] font-bold text-text-sub uppercase">Win Rate</p>
            <p className="text-lg font-black text-text-main">
              {trades.length > 0 
                ? Math.round((trades.filter(t => t.result === 'Win').length / trades.length) * 100) 
                : 0}%
            </p>
          </div>
          <div className="p-3 bg-card border border-border-dark rounded-2xl space-y-1">
            <p className="text-[10px] font-bold text-text-sub uppercase">Total Trades</p>
            <p className="text-lg font-black text-text-main">{trades.length}</p>
          </div>
          <div className="p-3 bg-card border border-border-dark rounded-2xl space-y-1">
            <p className="text-[10px] font-bold text-text-sub uppercase">Avg. Return</p>
            <p className="text-lg font-black text-profit">
              {trades.length > 0 
                ? (trades.reduce((acc, t) => acc + t.percentage, 0) / trades.length).toFixed(1) 
                : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Daily Challenges */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-main">Daily Challenges</h2>
          <span className="text-xs font-bold text-profit uppercase">3 Active</span>
        </div>
        <div className="space-y-3">
          {[
            { title: 'No Revenge Trading', reward: 50, icon: Shield, color: 'text-primary bg-primary/10' },
            { title: 'Max 2 Trades', reward: 30, icon: Zap, color: 'text-primary bg-primary/10' },
            { title: 'Follow All Rules', reward: 100, icon: Target, color: 'text-profit bg-profit/10' },
          ].map((challenge, i) => (
            <Card key={i} className="p-4 flex items-center justify-between hover:border-border-dark transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className={cn("p-2.5 rounded-2xl", challenge.color)}>
                  <challenge.icon size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-main">{challenge.title}</h3>
                  <p className="text-xs text-text-sub font-medium">Reward: +{challenge.reward} pts</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-text-sub group-hover:text-text-main transition-colors" />
            </Card>
          ))}
        </div>
      </div>

      {/* Latest Trade */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-main">Latest Trade</h2>
          <Button 
            variant="ghost" 
            className="text-xs font-bold text-text-sub uppercase"
            onClick={() => setIsHistoryModalOpen(true)}
          >
            History
          </Button>
        </div>
        <div className="space-y-3">
          {trades.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-3xl border-2 border-dashed border-border-dark">
              <History size={48} className="mx-auto text-text-sub/30 mb-3" />
              <p className="text-sm font-medium text-text-sub">No trades logged yet.</p>
              <Button variant="ghost" className="mt-2 text-profit" onClick={() => setIsLogModalOpen(true)}>Log your first trade</Button>
            </div>
          ) : (
            trades.slice(0, 1).map((trade) => (
              <Card key={trade.id} className="p-4 flex items-center justify-between border-primary/30 bg-primary/[0.02] shadow-xl shadow-primary/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <div className="flex items-center gap-4">
                  <div className={cn("p-2.5 rounded-2xl", trade.result === 'Win' ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss")}>
                    {trade.result === 'Win' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-text-main">{trade.pair || trade.assetType}</h3>
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase", trade.ruleFollowed ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss")}>
                        {trade.ruleFollowed ? 'Disciplined' : 'Rule Broken'}
                      </span>
                    </div>
                    <p className="text-xs text-text-sub font-medium">{trade.result} • {trade.tradeAmount}{currencySymbol} • {trade.percentage}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-bold", trade.capitalChange >= 0 ? "text-profit" : "text-loss")}>
                    {trade.capitalChange >= 0 ? '+' : ''}{currencySymbol}{Math.abs(trade.capitalChange).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-text-sub font-medium">
                    {trade.timestamp?.toDate ? format(trade.timestamp.toDate(), 'HH:mm') : 'Just now'}
                  </p>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* History Modal */}
      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Trade History">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {trades.map((trade) => (
            <Card key={trade.id} className="p-4 flex items-center justify-between border-border-dark">
              <div className="flex items-center gap-4">
                <div className={cn("p-2.5 rounded-2xl", trade.result === 'Win' ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss")}>
                  {trade.result === 'Win' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-text-main">{trade.pair || trade.assetType}</h3>
                    <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter", trade.ruleFollowed ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss")}>
                      {trade.ruleFollowed ? 'Disciplined' : 'Rule Broken'}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-sub font-bold uppercase tracking-widest">{trade.result} • {trade.tradeAmount}{currencySymbol} • {trade.percentage}%</p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn("text-sm font-black", trade.capitalChange >= 0 ? "text-profit" : "text-loss")}>
                  {trade.capitalChange >= 0 ? '+' : ''}{currencySymbol}{Math.abs(trade.capitalChange).toFixed(2)}
                </p>
                <p className="text-[10px] text-text-sub font-bold uppercase">
                  {trade.timestamp?.toDate ? format(trade.timestamp.toDate(), 'HH:mm') : 'Just now'}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Modal>

      {/* Level Progress Modal */}
      <Modal isOpen={isLevelModalOpen} onClose={() => setIsLevelModalOpen(false)} title="Level Progress">
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-profit/10 text-profit flex items-center justify-center mx-auto shadow-inner">
            <Trophy size={40} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-text-main uppercase tracking-tight">{levelInfo.current}</h3>
            <p className="text-sm text-text-sub font-medium">Current Discipline Level</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span className="text-text-sub">Progress to {levelInfo.next}</span>
              <span className="text-profit">{profile?.totalScore || 0} / {levelInfo.total} pts</span>
            </div>
            <div className="w-full bg-background h-3 rounded-full overflow-hidden border border-border-dark">
              <div 
                className="bg-profit h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(50,102,173,0.3)]" 
                style={{ width: `${Math.min(100, ((profile?.totalScore || 0) / levelInfo.total) * 100)}%` }} 
              />
            </div>
          </div>

          {levelInfo.needed > 0 ? (
            <div className="p-4 bg-profit/10 rounded-2xl border border-profit/20">
              <p className="text-sm font-bold text-text-main">
                You need <span className="text-lg font-black">{levelInfo.needed}</span> more points to reach {levelInfo.next}!
              </p>
              <p className="text-xs text-profit mt-1 font-medium italic">Keep following your rules to earn points.</p>
            </div>
          ) : (
            <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
              <p className="text-sm font-bold text-primary">
                You've reached the highest level! You are a legend.
              </p>
            </div>
          )}

          <Button onClick={() => setIsLevelModalOpen(false)} className="w-full h-12">
            Keep Grinding
          </Button>
        </div>
      </Modal>

      {/* Tutorial Modal */}
      <Modal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} title="Quick Start Guide">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-profit/10 text-profit flex items-center justify-center shrink-0">
                <Plus size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-text-main">Log Every Trade</h3>
                <p className="text-xs text-text-sub leading-relaxed">Use the floating (+) button to log your trades. Be honest about your emotions!</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Target size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-text-main">Discipline Score</h3>
                <p className="text-xs text-text-sub leading-relaxed">Follow your rules to gain +10 pts. Breaking rules costs -20 pts. Discipline is your edge.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Flame size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-text-main">Maintain Streaks</h3>
                <p className="text-xs text-text-sub leading-relaxed">Log disciplined trades daily to build your streak and climb the leaderboard.</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setIsTutorialOpen(false)} className="w-full h-12">
            Got it, Let's Trade!
          </Button>
        </div>
      </Modal>

      {/* Log Trade Modal */}
      <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title="Log New Trade">
        <form onSubmit={handleLogTrade} className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-text-sub">Asset Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Currency', 'Crypto', 'Commodity'] as AssetType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setAssetType(t);
                    setPair('');
                  }}
                  className={cn(
                    "py-2.5 rounded-xl border font-semibold text-xs transition-all",
                    assetType === t 
                      ? "bg-primary border-primary text-white"
                      : "bg-background border-border-dark text-text-sub hover:bg-border-dark"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-text-sub">Trading Pair / Symbol</label>
            <div className="relative">
              <div 
                onClick={() => setIsPairListOpen(!isPairListOpen)}
                className="flex items-center justify-between h-12 w-full rounded-xl border border-border-dark bg-background px-4 py-2 text-sm font-bold cursor-pointer hover:border-primary/50 transition-colors"
              >
                <span className={pair ? "text-text-main" : "text-text-sub"}>
                  {pair || "Select Pair"}
                </span>
                <ChevronDown size={18} className={cn("text-text-sub transition-transform", isPairListOpen && "rotate-180")} />
              </div>

              {isPairListOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border-dark rounded-2xl shadow-2xl z-[110] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-3 border-b border-border-dark">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub" />
                      <Input
                        placeholder="Search pair..."
                        value={pairSearch}
                        onChange={(e) => setPairSearch(e.target.value)}
                        className="h-10 pl-10 text-xs font-bold"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {TRADING_PAIRS[assetType]
                      .filter(p => p.toLowerCase().includes(pairSearch.toLowerCase()))
                      .map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setPair(p);
                            setIsPairListOpen(false);
                            setPairSearch('');
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-colors",
                            pair === p ? "bg-profit/10 text-profit" : "text-text-sub hover:bg-border-dark"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    {TRADING_PAIRS[assetType].filter(p => p.toLowerCase().includes(pairSearch.toLowerCase())).length === 0 && (
                      <div className="py-8 text-center">
                        <p className="text-xs font-bold text-text-sub uppercase">No pairs found</p>
                        <button 
                          type="button"
                          onClick={() => {
                            setPair(pairSearch);
                            setIsPairListOpen(false);
                            setPairSearch('');
                          }}
                          className="mt-2 text-xs font-bold text-profit underline"
                        >
                          Use "{pairSearch}" anyway
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-sm font-bold text-text-sub">Trade Amount ({currencySymbol})</label>
              <Input
                type="number"
                placeholder="0.00"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                className={cn(
                  "h-12 font-bold",
                  parseFloat(tradeAmount) > maxRiskPerTrade && "border-orange-500 text-orange-500 focus-visible:ring-orange-500"
                )}
              />
              {parseFloat(tradeAmount) > maxRiskPerTrade && (
                <p className="text-[10px] font-bold text-orange-500 flex items-center gap-1">
                  <ShieldAlert size={10} />
                  Exceeds 2% Risk Limit ({currencySymbol}{maxRiskPerTrade.toFixed(2)})
                </p>
              )}
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold text-text-sub">Return (%)</label>
              <Input
                type="number"
                placeholder="e.g. 80"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="h-12 font-bold"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-text-sub">Result</label>
            <div className="grid grid-cols-2 gap-3">
              {(['Win', 'Loss'] as TradeResult[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setResult(r)}
                  className={cn(
                    "h-12 rounded-2xl border-2 font-bold transition-all",
                    result === r 
                      ? (r === 'Win' ? "bg-profit/10 border-profit text-profit" : "bg-loss/10 border-loss text-loss")
                      : "bg-background border-border-dark text-text-sub hover:border-text-sub/30"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-text-sub">Did you follow your rules?</label>
            <div className="grid grid-cols-2 gap-3">
              {[true, false].map((val) => (
                <button
                  key={val.toString()}
                  type="button"
                  onClick={() => setRuleFollowed(val)}
                  className={cn(
                    "h-12 rounded-2xl border-2 font-bold transition-all",
                    ruleFollowed === val 
                      ? "bg-profit/10 border-profit text-profit"
                      : "bg-background border-border-dark text-text-sub hover:border-text-sub/30"
                  )}
                >
                  {val ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-text-sub">How did you feel?</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Calm', 'Fear', 'Greed', 'Revenge', 'Confident', 'FOMO'] as Emotion[]).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmotion(e)}
                  className={cn(
                    "py-2.5 rounded-xl border font-semibold text-xs transition-all",
                    emotion === e 
                      ? "bg-primary border-primary text-white"
                      : "bg-background border-border-dark text-text-sub hover:bg-border-dark"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-text-sub">Trade Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {(['1m', '5m', '15m', '30m', '1h', '4h', 'Daily'] as Duration[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cn(
                    "py-2 rounded-lg border font-semibold text-[10px] transition-all",
                    duration === d 
                      ? "bg-primary border-primary text-white"
                      : "bg-background border-border-dark text-text-sub hover:bg-border-dark"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-background rounded-2xl border border-border-dark space-y-1">
            <p className="text-[10px] font-bold text-text-sub uppercase tracking-wider">Estimated Capital Change</p>
            <p className={cn("text-xl font-black", result === 'Win' ? "text-profit" : "text-loss")}>
              {result === 'Win' ? '+' : '-'}{currencySymbol}{((parseFloat(tradeAmount) || 0) * (parseFloat(percentage) || 0) / 100).toFixed(2)}
            </p>
          </div>

          <Button type="submit" className="w-full h-14 text-lg" disabled={loading}>
            {loading ? 'Logging...' : 'Submit Trade'}
          </Button>
        </form>
      </Modal>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsLogModalOpen(true)}
        className="fixed bottom-8 right-6 w-16 h-16 bg-profit text-white rounded-3xl shadow-2xl shadow-profit/20 flex items-center justify-center hover:bg-profit/90 transition-all active:scale-90 z-40"
      >
        <Plus size={32} />
      </button>
    </div>
  );
};

export const Leaderboard: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filter, setFilter] = useState<'Growth %' | 'Discipline' | 'Consistency'>('Discipline');
  const [timeframe, setTimeframe] = useState<'Weekly' | 'Monthly' | 'All-time'>('All-time');

  useEffect(() => {
    let orderByField = 'totalScore';
    if (filter === 'Growth %') orderByField = 'growthPercent';
    if (filter === 'Consistency') orderByField = 'streak';

    const q = query(collection(db, 'users_public'), orderBy(orderByField, 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile & { growthPercent?: number }));
    }, (error) => {
      console.error("Leaderboard snapshot error:", error);
    });
    return () => unsubscribe();
  }, [filter, timeframe]);

  return (
    <div className="pb-10 pt-6 px-4 space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <Trophy size={48} className="mx-auto text-amber-500 mb-2" />
        <h1 className="text-2xl font-bold text-text-main tracking-tight">Elite Leaderboard</h1>
        <p className="text-sm text-text-sub font-medium">Only the most disciplined traders rise to the top.</p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {(['Discipline', 'Growth %', 'Consistency'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                  filter === f 
                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                    : "bg-card border-border-dark text-text-sub hover:bg-border-dark"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {(['Weekly', 'Monthly', 'All-time'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                  timeframe === t 
                    ? "bg-text-main border-text-main text-background" 
                    : "bg-background border-border-dark text-text-sub hover:bg-border-dark"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {users.map((u, i) => (
            <Card key={u.uid} className={cn(
              "p-4 flex items-center justify-between transition-all", 
              i === 0 ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/5" : "border-border-dark"
            )}>
              <div className="flex items-center gap-4">
                <span className={cn("text-lg font-black w-6", i === 0 ? "text-primary" : "text-text-sub/30")}>{i + 1}</span>
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center text-text-sub font-bold uppercase overflow-hidden border border-border-dark">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" />
                    ) : (
                      u.displayName?.[0] || 'U'
                    )}
                  </div>
                  {u.isPro && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center border-2 border-card shadow-sm">
                      <Crown size={10} fill="currentColor" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <h3 className={cn("text-sm font-bold", u.isPro ? "text-text-main" : "text-text-main")}>
                      {u.displayName}
                      {u.isPro && <span className="ml-1 text-[10px] text-primary font-black uppercase">👑 VIP</span>}
                    </h3>
                    {u.role === 'verified' && <CheckCircle2 size={14} className="text-primary fill-primary/10" />}
                  </div>
                  <p className="text-[10px] text-text-sub font-bold uppercase tracking-wider">{u.level} • {u.streak} Day Streak</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-text-main">
                  {filter === 'Discipline' ? u.totalScore?.toLocaleString() : 
                   filter === 'Growth %' ? `${Math.round((u.currentCapital || 0) / (u.startingCapital || 1) * 100 - 100)}%` :
                   u.streak}
                </p>
                <p className="text-[10px] text-text-sub font-bold uppercase tracking-tighter">
                  {filter === 'Discipline' ? 'Points' : filter === 'Growth %' ? 'Growth' : 'Streak'}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
