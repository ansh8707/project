import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input, cn, Modal } from './components/UI';
import { 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Zap, 
  Target, 
  Brain, 
  BarChart3, 
  ShieldAlert, 
  Calculator, 
  Trophy, 
  Star,
  Lock,
  Eye,
  EyeOff,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Calendar,
  Settings,
  Megaphone,
  Plus,
  Crown,
  Flame,
  ShieldCheck,
  BookOpen,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from './firebase';
import { doc, updateDoc, collection, query, orderBy, limit, onSnapshot, serverTimestamp, addDoc, increment, setDoc, where, getDocs, deleteDoc } from 'firebase/firestore';
import { Trade, UserProfile, AssetType, TradeResult, Emotion, Duration } from './types';
import { format, startOfWeek, startOfMonth, isSameDay, subDays, isAfter, isBefore } from 'date-fns';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { useNavigate } from 'react-router-dom';

export const ProDashboard: React.FC = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [riskLimits, setRiskLimits] = useState({
    maxRiskPerTrade: 1,
    maxDailyLoss: 100,
    maxTradesPerDay: 3
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showBadge, setShowBadge] = useState<{ name: string, icon: any } | null>(null);

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
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [signals, setSignals] = useState<any[]>([]);

  const currencySymbol = profile?.currency === 'INR' ? '₹' : '$';

  const pairs = {
    Currency: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/GBP', 'NZD/USD'],
    Crypto: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'XRP/USD', 'ADA/USD'],
    Commodity: ['GOLD', 'SILVER', 'CRUDE OIL', 'NATURAL GAS']
  };

  const filteredPairs = pairs[assetType].filter(p => 
    p.toLowerCase().includes(pairSearch.toLowerCase())
  );

  useEffect(() => {
    if (!user) return;
    const tradesRef = collection(db, 'users', user.uid, 'trades');
    const q = query(tradesRef, orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tradesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade));
      setTrades(tradesData);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'signals'), where('active', '==', true), orderBy('timestamp', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const signalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSignals(signalsData);
    });
    return () => unsubscribe();
  }, []);

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

  useEffect(() => {
    if (profile?.riskLimits) {
      setRiskLimits(profile.riskLimits);
    }
  }, [profile]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter(t => {
    if (!t.timestamp) return false;
    const date = t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
    return date.toISOString().split('T')[0] === todayStr;
  });
  const dailyPnL = todayTrades.reduce((acc, t) => acc + t.capitalChange, 0);
  const dailyPnLPercent = (profile?.currentCapital || 0) > 0 ? (dailyPnL / profile!.currentCapital!) * 100 : 0;

  const handleLogTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      setError("User profile not loaded. Please wait.");
      return;
    }

    // Pro Risk Limits Check
    const { maxDailyLoss, maxTradesPerDay, maxRiskPerTrade } = riskLimits;
    
    // Check max daily loss
    if (Math.abs(dailyPnL) >= maxDailyLoss && dailyPnL < 0) {
      setError(`🚫 VIP Stop: Max Daily Loss (${currencySymbol}${maxDailyLoss}) hit! Protect your capital.`);
      return;
    }

    // Check max trades per day
    if (todayTrades.length >= maxTradesPerDay) {
      setError(`🚫 VIP Stop: Max Trades Per Day (${maxTradesPerDay}) reached! Overtrading is the enemy.`);
      return;
    }

    // Check risk per trade
    const amount = parseFloat(tradeAmount) || 0;
    const riskPercent = (amount / (profile.currentCapital || 1)) * 100;
    if (riskPercent > maxRiskPerTrade) {
      setError(`⚠️ VIP Warning: Risk per trade (${riskPercent.toFixed(1)}%) exceeds your limit of ${maxRiskPerTrade}%!`);
      return;
    }

    // Focus Mode Check
    if (profile?.focusMode) {
      if (!ruleFollowed) {
        setError("🚫 Focus Mode ACTIVE: You cannot log trades where rules were not followed.");
        return;
      }
      if (['Greed', 'Fear', 'Revenge', 'FOMO'].includes(emotion)) {
        setError(`🚫 Focus Mode ACTIVE: Emotional trading (${emotion}) is blocked.`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const scoreChange = ruleFollowed ? 15 : -30; // VIP gets more/less points
      const percent = parseFloat(percentage) || 0;
      const currentCap = profile.currentCapital || 0;
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

      const tradesRef = collection(db, 'users', user.uid, 'trades');
      await addDoc(tradesRef, tradeData);

      const newStreak = ruleFollowed ? (profile.streak || 0) + 1 : 0;
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        disciplineScore: increment(scoreChange),
        totalScore: increment(scoreChange),
        currentCapital: increment(change),
        streak: newStreak,
      }, { merge: true });

      setIsLogModalOpen(false);
      setTradeAmount('');
      setPercentage('');
      setPair('');
      setPairSearch('');
      setIsPairListOpen(false);
      
      if (newStreak > 0 && newStreak % 5 === 0) {
        setShowBadge({ name: `${newStreak} Day Streak`, icon: Flame });
      } else if (ruleFollowed && (profile.disciplineScore || 0) > 500) {
        setShowBadge({ name: 'Disciplined Trader', icon: ShieldCheck });
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error logging trade:", err);
      setError(err.message || "Failed to log trade.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { riskLimits });
      setIsRiskModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleFocusMode = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { focusMode: !profile?.focusMode });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // --- Analytics Logic ---
  const stats = useMemo(() => {
    if (trades.length === 0) {
      return {
        weeklyGrowth: 0,
        monthlyGrowth: 0,
        winRate: 0,
        bestDay: 0,
        worstDay: 0,
        consistencyScore: 0,
        totalTrades: 0,
        percent: 0,
        totalGrowth: 0,
        best: 0,
        worst: 0
      };
    }

    const now = new Date();
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    const weeklyTrades = trades.filter(t => {
      const date = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp || now);
      return date >= weekStart;
    });
    const monthlyTrades = trades.filter(t => {
      const date = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp || now);
      return date >= monthStart;
    });

    const weeklyGrowth = weeklyTrades.reduce((acc, t) => acc + t.capitalChange, 0);
    const monthlyGrowth = monthlyTrades.reduce((acc, t) => acc + t.capitalChange, 0);

    const winRate = (trades.filter(t => t.result === 'Win').length / trades.length) * 100;
    
    // Best/Worst Day
    const dailyPnL: { [key: string]: number } = {};
    trades.forEach(t => {
      const dateObj = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp || now);
      const date = format(dateObj, 'yyyy-MM-dd');
      dailyPnL[date] = (dailyPnL[date] || 0) + t.capitalChange;
    });
    const bestDay = Math.max(...Object.values(dailyPnL));
    const worstDay = Math.min(...Object.values(dailyPnL));

    // Consistency Score (0-100)
    // Based on rule following and win rate stability
    const ruleFollowRate = (trades.filter(t => t.ruleFollowed).length / trades.length) * 100;
    const consistencyScore = Math.round((ruleFollowRate * 0.6) + (winRate * 0.4));

    // Growth Stats
    const totalGrowth = trades.reduce((acc, t) => acc + t.capitalChange, 0);
    const growthPercent = (totalGrowth / (profile?.startingCapital || 10000)) * 100;

    return {
      weeklyGrowth,
      monthlyGrowth,
      winRate,
      bestDay,
      worstDay,
      consistencyScore,
      totalTrades: trades.length,
      percent: growthPercent,
      totalGrowth,
      best: bestDay,
      worst: worstDay
    };
  }, [trades, profile?.startingCapital]);

  const growthStats = stats;

  // --- Insights Logic ---
  const insights = useMemo(() => {
    const list: string[] = [];
    
    if (trades.length < 5) {
      list.push("You are close to unlocking deep AI insights 👀");
      list.push(`Log ${5 - trades.length} more trades to reveal your hidden trading patterns.`);
      return list;
    }

    // Revenge Trading Detection (3 losses in a row followed by a quick trade)
    let lossStreak = 0;
    for (let i = 0; i < Math.min(trades.length, 10); i++) {
      if (trades[i].result === 'Loss') lossStreak++;
      else break;
    }
    if (lossStreak >= 3) {
      list.push("Tu 3 din se revenge trade kar raha hai. Stop and reset.");
    }

    // Time-based analysis
    const morningWins = trades.filter(t => {
      const date = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp || new Date());
      const hour = date.getHours();
      return hour >= 8 && hour <= 12 && t.result === 'Win';
    }).length;
    const morningTotal = trades.filter(t => {
      const date = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp || new Date());
      const hour = date.getHours();
      return hour >= 8 && hour <= 12;
    }).length;

    if (morningTotal > 5 && (morningWins / morningTotal) > 0.6) {
      list.push("Morning trades me tera win rate high hai. Stick to your peak hours.");
    }

    // Overtrading after loss
    const lastTrade = trades[0];
    if (lastTrade?.result === 'Loss') {
      const tradesToday = trades.filter(t => {
        const date = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp || new Date());
        return isSameDay(date, new Date());
      }).length;
      if (tradesToday > 3) {
        list.push("Loss ke baad tu overtrade karta hai. Control your emotions.");
      }
    }

    if (list.length === 0) {
      list.push("Your trading pattern looks stable. Keep following your rules.");
    }

    return list;
  }, [trades]);

  // --- Performance Score Logic ---
  const perfScore = useMemo(() => {
    if (trades.length === 0) return { discipline: 0, risk: 0, consistency: 0, emotion: 0, total: 0, status: 'Beginner' };
    
    const discipline = (trades.filter(t => t.ruleFollowed).length / trades.length) * 100;
    const risk = 85; // Mock for now, would be based on risk limits
    const consistency = stats?.consistencyScore || 0;
    const emotion = (trades.filter(t => ['Calm', 'Confident'].includes(t.emotion)).length / trades.length) * 100;
    
    const total = Math.round((discipline + risk + consistency + emotion) / 4);
    
    let status = 'Beginner';
    if (total > 90) status = 'Elite';
    else if (total > 75) status = 'Disciplined';
    else if (total > 50) status = 'Controlled';
    
    return { discipline, risk, consistency, emotion, total, status };
  }, [trades, stats]);

  // --- Risk Alert Logic ---
  const riskAlert = useMemo(() => {
    if (!profile) return null;
    const now = new Date();
    const todayTrades = trades.filter(t => {
      const date = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp || now);
      return isSameDay(date, now);
    });
    const todayLoss = todayTrades.reduce((acc, t) => t.result === 'Loss' ? acc + t.capitalChange : acc, 0);
    const absLoss = Math.abs(todayLoss);
    const limit = profile.riskLimits?.maxDailyLoss || 100;
    
    if (absLoss >= limit * 0.8) {
      return {
        message: absLoss >= limit ? "CRITICAL: Daily Loss Limit Reached! Stop Trading." : "Warning: You are near daily loss limit!",
        severity: absLoss >= limit ? 'critical' : 'warning'
      };
    }
    return null;
  }, [trades, profile]);

  const [userRank, setUserRank] = useState<number | null>(null);
  const [topScore, setTopScore] = useState<number>(0);

  // --- Fetch Real Rank ---
  useEffect(() => {
    if (!profile?.uid) return;

    const fetchRank = async () => {
      try {
        // Get count of users with higher score
        const usersRef = collection(db, 'users_public');
        const qRank = query(usersRef, where('totalScore', '>', profile.totalScore || 0));
        const snapshot = await getDocs(qRank);
        setUserRank(snapshot.size + 1);

        // Get top score
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

  return (
    <div className="pb-24 pt-6 px-4 space-y-8 max-w-4xl mx-auto">
      {/* Header with Verified Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
            <Crown size={24} fill="currentColor" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-text-main">{profile?.displayName || 'Trader'}</h1>
              <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-black rounded-full uppercase tracking-tighter flex items-center gap-1">
                <Crown size={10} /> VIP
              </span>
            </div>
            <p className="text-xs font-bold text-text-sub uppercase tracking-widest">VIP Performance Hub 👑</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleFocusMode}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all border relative overflow-hidden group",
              profile?.focusMode 
                ? "bg-loss/20 border-loss/40 text-loss shadow-[0_0_15px_rgba(239,68,68,0.3)]" 
                : "bg-primary/10 border-primary/20 text-primary"
            )}
          >
            {profile?.focusMode && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            )}
            {profile?.focusMode ? <Brain size={16} className="animate-pulse" /> : <Eye size={16} />}
            {profile?.focusMode ? 'Focus ON' : 'Focus OFF'}
          </button>
        </div>
      </div>

      {profile?.focusMode && (
        <div className="bg-loss/10 border border-loss/20 p-3 rounded-xl flex items-center gap-3 animate-pulse">
          <ShieldAlert size={16} className="text-loss" />
          <p className="text-[10px] font-black text-loss uppercase tracking-widest">Only rule-based trades allowed in Focus Mode</p>
        </div>
      )}

      {/* BIG ACTION BUTTON */}
      <div className="flex justify-center py-4">
        <button 
          onClick={() => setIsLogModalOpen(true)}
          className="group relative flex flex-col items-center gap-2 transition-transform active:scale-95"
        >
          <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all" />
          <div className="relative w-24 h-24 bg-primary rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(52,168,83,0.4)] border-4 border-white/20">
            <Plus size={48} strokeWidth={3} />
          </div>
          <span className="relative text-lg font-black text-text-main uppercase tracking-[0.2em] mt-2">Log Trade</span>
          <div className="h-1 w-12 bg-primary rounded-full mt-1" />
        </button>
      </div>

      {riskAlert && (
        <div className={cn(
          "p-4 rounded-2xl flex items-center gap-4 border animate-in fade-in slide-in-from-top-4 duration-500",
          riskAlert.severity === 'critical' 
            ? "bg-loss/20 border-loss/40 text-loss shadow-[0_0_20px_rgba(239,68,68,0.4)]" 
            : "bg-warning/20 border-warning/40 text-warning"
        )}>
          <div className={cn("p-3 rounded-xl", riskAlert.severity === 'critical' ? "bg-loss/20" : "bg-warning/20")}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-widest">{riskAlert.message}</p>
            <p className="text-[10px] font-bold opacity-80 uppercase">Discipline is the key to survival.</p>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="bg-profit/10 border border-profit/20 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="text-profit" size={20} />
          <p className="text-sm font-bold text-profit">VIP Trade Logged Successfully! Capital Updated.</p>
        </div>
      )}

      {showBadge && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="max-w-xs w-full p-8 text-center space-y-6 border-primary/40 bg-gradient-to-b from-card to-primary/5 shadow-[0_0_50px_rgba(52,168,83,0.2)]">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto shadow-xl shadow-primary/20 animate-bounce">
              <showBadge.icon size={48} className="text-white" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-black text-primary uppercase tracking-[0.2em]">Badge Unlocked</p>
              <h2 className="text-2xl font-black text-text-main">{showBadge.name}</h2>
            </div>
            <Button className="w-full h-12" onClick={() => setShowBadge(null)}>
              LFG! 🔥
            </Button>
          </Card>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5 space-y-2 bg-primary/10 border-primary/20">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">VIP Capital</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-text-main">{currencySymbol}{profile?.currentCapital?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className={cn("inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary")}>
            <TrendingUp size={12} className="mr-1" />
            Elite Growth: {(growthStats?.percent || 0).toFixed(1)}%
          </div>
        </Card>

        <Card className="p-5 space-y-2 bg-card border-border-dark">
          <p className="text-[10px] font-black text-text-sub uppercase tracking-widest">VIP Discipline</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-text-main">{profile?.disciplineScore}</span>
            <span className="text-[10px] text-text-sub font-bold uppercase">pts</span>
          </div>
          <div className="w-full bg-background h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-500" 
              style={{ width: `${Math.min(100, (profile?.disciplineScore || 0) / 10)}%` }} 
            />
          </div>
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

      {/* Smart Insights Engine */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="text-primary" size={20} />
          <h2 className="text-lg font-bold text-text-main">Smart Insights</h2>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {insights.map((insight, i) => (
            <Card key={i} className="p-4 bg-primary/5 border-primary/20 flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Lightbulb size={18} />
              </div>
              <p className="text-sm font-bold text-text-main leading-relaxed italic">
                "{insight}"
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Performance Score Card */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-text-main">Performance Score</h2>
        <Card className="p-6 bg-card border-border-dark overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Trophy size={120} />
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-border-dark"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={364.4}
                  strokeDashoffset={364.4 - (364.4 * perfScore.total) / 100}
                  className="text-primary transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-text-main">{perfScore.total}</span>
                <span className="text-[10px] font-bold text-text-sub uppercase">Score</span>
              </div>
            </div>
            <div className="flex-1 space-y-4 w-full">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-text-sub uppercase tracking-widest">Status:</span>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                  perfScore.status === 'Elite' ? "bg-primary text-white shadow-lg shadow-primary/20" :
                  perfScore.status === 'Disciplined' ? "bg-profit/20 text-profit" :
                  perfScore.status === 'Controlled' ? "bg-warning/20 text-warning" :
                  "bg-text-sub/10 text-text-sub"
                )}>
                  {perfScore.status} Trader
                </span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <ScoreMetric label="Discipline" value={perfScore.discipline} color="text-primary" />
                <ScoreMetric label="Risk Control" value={perfScore.risk} color="text-profit" />
                <ScoreMetric label="Consistency" value={perfScore.consistency} color="text-primary" />
                <ScoreMetric label="Emotion" value={perfScore.emotion} color="text-profit" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Advanced Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-text-main">Growth Analytics</h2>
          <Card className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-background rounded-2xl border border-border-dark">
                <p className="text-[10px] font-bold text-text-sub uppercase mb-1">Best Day</p>
                <p className="text-sm font-black text-profit">+{currencySymbol}{(growthStats?.best || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-background rounded-2xl border border-border-dark">
                <p className="text-[10px] font-bold text-text-sub uppercase mb-1">Worst Day</p>
                <p className="text-sm font-black text-loss">{currencySymbol}{(growthStats?.worst || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[...trades].reverse().map(t => ({ val: t.currentCapital + t.capitalChange }))}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="val" stroke="#FFFFFF" strokeWidth={3} fill="url(#colorGrowth)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#111', 
                      border: '1px solid #333', 
                      borderRadius: '12px',
                      fontSize: '10px'
                    }}
                    itemStyle={{ color: '#FFFFFF' }}
                    labelStyle={{ display: 'none' }}
                    formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, 'Capital']}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-text-main">Risk Control</h2>
          <Card className="p-5 space-y-6">
            <div className="space-y-4">
              <RiskMetric 
                icon={ShieldAlert} 
                label="Max Daily Loss" 
                value={`${currencySymbol}${riskLimits.maxDailyLoss}`} 
                color="text-loss" 
              />
              <RiskMetric 
                icon={Target} 
                label="Risk Per Trade" 
                value={`${riskLimits.maxRiskPerTrade}%`} 
                color="text-primary" 
              />
              <RiskMetric 
                icon={Clock} 
                label="Max Trades/Day" 
                value={riskLimits.maxTradesPerDay.toString()} 
                color="text-text-main" 
              />
            </div>
            <Button 
              variant="outline" 
              className="w-full h-12 border-border-dark hover:bg-border-dark"
              onClick={() => setIsRiskModalOpen(true)}
            >
              <Settings size={16} className="mr-2" />
              Configure Risk Engine
            </Button>
          </Card>
        </div>
      </div>

      {/* Money Management Engine */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-text-main">Money Management</h2>
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <Calculator size={24} />
            </div>
            <div>
              <h3 className="font-bold text-text-main">Position Sizing Engine</h3>
              <p className="text-xs text-text-sub font-medium">Auto-calculated based on your current capital</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-background rounded-2xl border border-border-dark space-y-2">
              <p className="text-[10px] font-bold text-text-sub uppercase">Safe Trade Size</p>
              <p className="text-xl font-black text-profit">
                {currencySymbol}{Math.round((profile?.currentCapital || 0) * (riskLimits.maxRiskPerTrade / 100)).toLocaleString()}
              </p>
              <p className="text-[10px] text-text-sub font-medium">Based on {riskLimits.maxRiskPerTrade}% risk</p>
            </div>
            <div className="p-4 bg-background rounded-2xl border border-border-dark space-y-2">
              <p className="text-[10px] font-bold text-text-sub uppercase">Next Trade Suggestion</p>
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-primary" />
                <p className="text-sm font-bold text-text-main">Reduce size by 20%</p>
              </div>
              <p className="text-[10px] text-text-sub font-medium">Market volatility is high</p>
            </div>
            <div className="p-4 bg-background rounded-2xl border border-border-dark space-y-2">
              <p className="text-[10px] font-bold text-text-sub uppercase">Safe Mode</p>
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-profit" />
                <p className="text-sm font-bold text-profit">ACTIVE</p>
              </div>
              <p className="text-[10px] text-text-sub font-medium">Capital protection priority</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Daily Pro Guidance */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="text-primary" size={20} />
          <h2 className="text-lg font-bold text-text-main">Daily Pro Guidance</h2>
        </div>
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Megaphone size={100} />
          </div>
          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-black">X</div>
              <div>
                <p className="text-xs font-black text-primary uppercase tracking-widest">Master Mentor</p>
                <p className="text-[10px] text-text-sub font-bold uppercase">Today's Market Outlook</p>
              </div>
            </div>
            <p className="text-sm font-bold text-text-main leading-relaxed">
              "Aaj market slow hai — avoid overtrading. Trend strong hai but wait for a pullback at key support levels before entering. Discipline is your only edge today."
            </p>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1 text-[10px] font-bold text-profit uppercase">
                <CheckCircle2 size={12} />
                High Probability
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-text-sub uppercase">
                <Clock size={12} />
                Updated 2h ago
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Weekly Report System */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-text-main">Weekly Performance Report</h2>
        <Card className="p-0 overflow-hidden border-border-dark">
          <div className="p-5 bg-background border-b border-border-dark flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="text-text-sub" size={20} />
              <span className="text-sm font-bold text-text-main">March 11 - March 18, 2026</span>
            </div>
            <span className="px-3 py-1 bg-profit/10 text-profit text-[10px] font-black rounded-full uppercase">Positive Week</span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-text-sub uppercase tracking-widest">Key Metrics</h4>
              <div className="space-y-3">
                <ReportItem label="Win Rate" value={`${(stats?.winRate || 0).toFixed(1)}%`} trend="up" />
                <ReportItem label="Profit Factor" value="1.82" trend="up" />
                <ReportItem label="Avg. Hold Time" value="42m" trend="neutral" />
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-text-sub uppercase tracking-widest">Top Mistakes</h4>
              <div className="space-y-2">
                <div className="p-2 bg-loss/5 rounded-lg border border-loss/10 flex items-center gap-2">
                  <AlertCircle size={14} className="text-loss" />
                  <span className="text-xs font-bold text-text-main">Early Exit (3 times)</span>
                </div>
                <div className="p-2 bg-loss/5 rounded-lg border border-loss/10 flex items-center gap-2">
                  <AlertCircle size={14} className="text-loss" />
                  <span className="text-xs font-bold text-text-main">FOMO Entry (1 time)</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-text-sub uppercase tracking-widest">Improvement Tips</h4>
              <ul className="space-y-2">
                <li className="text-xs font-medium text-text-sub flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                  Stick to your 1:2 Risk-Reward ratio.
                </li>
                <li className="text-xs font-medium text-text-sub flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                  Avoid trading during high-impact news.
                </li>
              </ul>
            </div>
          </div>
          <div className="p-4 bg-background border-t border-border-dark">
            <Button variant="ghost" className="w-full text-xs font-bold text-primary uppercase hover:bg-primary/5">
              Download Full PDF Report
            </Button>
          </div>
        </Card>
      </div>

      {/* AI Mentor Advice */}
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
              <button 
                onClick={fetchAiAdvice}
                className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
              >
                Refresh Advice
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* VIP Signals Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="text-amber-500" size={20} />
            <h2 className="text-lg font-bold text-text-main">VIP Signals</h2>
          </div>
          <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black rounded-lg uppercase">Live</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {signals.length === 0 ? (
            <Card className="p-6 text-center border-dashed border-border-dark col-span-full">
              <p className="text-sm text-text-sub font-medium">Waiting for next high-probability signal...</p>
            </Card>
          ) : (
            signals.map(signal => (
              <Card key={signal.id} className="p-5 border-amber-500/20 bg-amber-500/[0.02] hover:border-amber-500/40 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-base font-black text-text-main">{signal.pair}</h3>
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                      signal.type === 'BUY' ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss"
                    )}>
                      {signal.type}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-text-sub font-bold uppercase">Entry</p>
                    <p className="text-sm font-black text-text-main">{signal.entry}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2 bg-profit/5 rounded-xl border border-profit/10">
                    <p className="text-[8px] font-bold text-profit uppercase">Take Profit</p>
                    <p className="text-xs font-black text-profit">{signal.tp}</p>
                  </div>
                  <div className="p-2 bg-loss/5 rounded-xl border border-loss/10">
                    <p className="text-[8px] font-bold text-loss uppercase">Stop Loss</p>
                    <p className="text-xs font-black text-loss">{signal.sl}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border-dark">
                  <span className="text-[10px] text-text-sub font-medium italic">By {signal.adminName}</span>
                  <span className="text-[10px] text-text-sub font-bold uppercase">
                    {format(signal.timestamp?.toDate ? signal.timestamp.toDate() : new Date(signal.timestamp || Date.now()), 'HH:mm')}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-main">Pro Strategy Library</h2>
          <span className="text-xs font-bold text-primary uppercase">New Content</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StrategyCard 
            title="The X13 Breakout" 
            desc="High probability trend continuation strategy."
            winRate="72%"
            difficulty="Intermediate"
          />
          <StrategyCard 
            title="Mean Reversion Pro" 
            desc="Capitalize on market overextensions."
            winRate="68%"
            difficulty="Advanced"
          />
        </div>
      </div>

      {/* Latest VIP Activity */}
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
              <Plus size={48} className="mx-auto text-text-sub/30 mb-3" />
              <p className="text-sm font-medium text-text-sub">No VIP trades logged yet.</p>
            </div>
          ) : (
            trades.slice(0, 1).map((trade) => (
              <Card key={trade.id} className="p-6 flex items-center justify-between border-primary/30 bg-primary/[0.02] shadow-xl shadow-primary/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <div className="flex items-center gap-4">
                  <div className={cn("p-4 rounded-2xl", trade.result === 'Win' ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss")}>
                    {trade.result === 'Win' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-text-main">{trade.pair}</h3>
                      <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter", trade.ruleFollowed ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss")}>
                        {trade.ruleFollowed ? 'Disciplined' : 'Rule Broken'}
                      </span>
                    </div>
                    <p className="text-xs text-text-sub font-bold uppercase tracking-widest">{trade.result} • {trade.tradeAmount}{currencySymbol} • {trade.percentage}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("text-xl font-black", trade.capitalChange >= 0 ? "text-profit" : "text-loss")}>
                    {trade.capitalChange >= 0 ? '+' : ''}{currencySymbol}{Math.abs(trade.capitalChange).toFixed(2)}
                  </p>
                  <p className="text-xs text-text-sub font-bold uppercase">
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
                    <h3 className="text-sm font-bold text-text-main">{trade.pair}</h3>
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
                  {trade.timestamp?.toDate ? format(trade.timestamp.toDate(), 'MMM d, HH:mm') : 'Just now'}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Modal>

      {/* Risk Config Modal */}
      <Modal isOpen={isRiskModalOpen} onClose={() => setIsRiskModalOpen(false)} title="Risk Control Engine">
        <form onSubmit={handleUpdateRisk} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-sub">Max Risk Per Trade (%)</label>
              <Input 
                type="number" 
                step="0.1"
                value={riskLimits.maxRiskPerTrade}
                onChange={(e) => setRiskLimits({...riskLimits, maxRiskPerTrade: parseFloat(e.target.value)})}
                className="h-12 font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-sub">Max Daily Loss ({currencySymbol})</label>
              <Input 
                type="number" 
                value={riskLimits.maxDailyLoss}
                onChange={(e) => setRiskLimits({...riskLimits, maxDailyLoss: parseFloat(e.target.value)})}
                className="h-12 font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-sub">Max Trades Per Day</label>
              <Input 
                type="number" 
                value={riskLimits.maxTradesPerDay}
                onChange={(e) => setRiskLimits({...riskLimits, maxTradesPerDay: parseInt(e.target.value)})}
                className="h-12 font-bold"
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12" disabled={loading}>
            {loading ? 'Updating Engine...' : 'Save Risk Profile'}
          </Button>
        </form>
      </Modal>

      {/* VIP Trade Log Modal */}
      <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title="Log VIP Trade 👑">
        <form onSubmit={handleLogTrade} className="space-y-6">
          {error && (
            <div className="bg-loss/10 border border-loss/20 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-loss shrink-0" size={20} />
              <p className="text-xs font-bold text-loss leading-relaxed">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {(['Currency', 'Crypto', 'Commodity'] as AssetType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setAssetType(type); setPair(''); }}
                  className={cn(
                    "py-2.5 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all",
                    assetType === type 
                      ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                      : "bg-background border-border-dark text-text-sub hover:bg-border-dark"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="relative">
              <label className="text-[10px] font-black text-text-sub uppercase tracking-widest mb-1.5 block">Asset Pair</label>
              <div className="relative">
                <Input 
                  value={pairSearch || pair}
                  onChange={(e) => {
                    setPairSearch(e.target.value);
                    setIsPairListOpen(true);
                  }}
                  onFocus={() => setIsPairListOpen(true)}
                  placeholder="Search pair (e.g. EUR/USD)"
                  className="h-12 font-bold pr-10"
                />
                <BarChart3 className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sub" size={18} />
              </div>
              
              {isPairListOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border-dark rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  {filteredPairs.length > 0 ? filteredPairs.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setPair(p);
                        setPairSearch('');
                        setIsPairListOpen(false);
                      }}
                      className="w-full text-left p-3 hover:bg-primary/10 hover:text-primary rounded-xl text-xs font-bold transition-colors flex items-center justify-between"
                    >
                      {p}
                      <ChevronRight size={14} />
                    </button>
                  )) : (
                    <div className="p-4 text-center text-text-sub text-xs font-bold">No pairs found</div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-sub uppercase tracking-widest block">Trade Amount ({currencySymbol})</label>
                <Input 
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-12 font-bold"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-sub uppercase tracking-widest block">Profit %</label>
                <Input 
                  type="number"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  placeholder="85"
                  className="h-12 font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-sub uppercase tracking-widest block">Result</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Win', 'Loss'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setResult(r)}
                      className={cn(
                        "py-3 rounded-xl border font-bold text-xs transition-all",
                        result === r 
                          ? r === 'Win' ? "bg-profit border-profit text-white shadow-lg shadow-profit/20" : "bg-loss border-loss text-white shadow-lg shadow-loss/20"
                          : "bg-background border-border-dark text-text-sub hover:bg-border-dark"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-sub uppercase tracking-widest block">Emotion</label>
                <select 
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value as Emotion)}
                  className="w-full h-12 bg-background border border-border-dark rounded-xl px-4 text-xs font-bold text-text-main focus:outline-none focus:border-primary transition-colors appearance-none"
                >
                  {['Calm', 'Fear', 'Greed', 'Revenge', 'Confident', 'FOMO'].map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-background rounded-2xl border border-border-dark">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl", ruleFollowed ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss")}>
                  {ruleFollowed ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-text-main">Rules Followed?</p>
                  <p className="text-[10px] text-text-sub font-medium">Did you stick to your plan?</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRuleFollowed(!ruleFollowed)}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  ruleFollowed ? "bg-profit" : "bg-border-dark"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  ruleFollowed ? "right-1" : "left-1"
                )} />
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full h-14 text-sm font-black uppercase tracking-widest" disabled={loading}>
            {loading ? 'Processing VIP Trade...' : 'Confirm VIP Trade Log'}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

const ScoreMetric = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-bold text-text-sub uppercase">{label}</span>
      <span className={cn("text-xs font-black", color)}>{Math.round(value)}%</span>
    </div>
    <div className="h-1.5 bg-background rounded-full overflow-hidden">
      <div 
        className={cn("h-full transition-all duration-1000", color.replace('text-', 'bg-'))}
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

const RiskMetric = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) => (
  <div className="flex items-center justify-between p-3 bg-background rounded-2xl border border-border-dark">
    <div className="flex items-center gap-3">
      <div className={cn("p-2 rounded-xl bg-opacity-10", color.replace('text-', 'bg-'), color)}>
        <Icon size={16} />
      </div>
      <span className="text-xs font-bold text-text-sub uppercase">{label}</span>
    </div>
    <span className={cn("text-sm font-black", color)}>{value}</span>
  </div>
);

const StrategyCard = ({ title, desc, winRate, difficulty }: { title: string, desc: string, winRate: string, difficulty: string }) => (
  <Card className="p-5 hover:border-primary/30 transition-all cursor-pointer group">
    <div className="flex justify-between items-start mb-3">
      <div className="p-2 bg-primary/10 text-primary rounded-xl">
        <BookOpen size={18} />
      </div>
      <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-lg uppercase">{difficulty}</span>
    </div>
    <h3 className="font-bold text-text-main mb-1 group-hover:text-primary transition-colors">{title}</h3>
    <p className="text-xs text-text-sub font-medium mb-4">{desc}</p>
    <div className="flex items-center justify-between pt-4 border-t border-border-dark">
      <div className="flex items-center gap-1">
        <CheckCircle2 size={14} className="text-profit" />
        <span className="text-[10px] font-bold text-text-main uppercase">{winRate} Win Rate</span>
      </div>
      <ChevronRight size={16} className="text-text-sub group-hover:translate-x-1 transition-transform" />
    </div>
  </Card>
);

const ReportItem = ({ label, value, trend }: { label: string, value: string, trend: 'up' | 'down' | 'neutral' }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs font-medium text-text-sub">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-sm font-black text-text-main">{value}</span>
      {trend === 'up' && <ArrowUpRight size={14} className="text-profit" />}
      {trend === 'down' && <ArrowDownRight size={14} className="text-loss" />}
    </div>
  </div>
);
