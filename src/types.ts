export type UserRole = 'unverified' | 'verified' | 'admin';
export type Level = 'Beginner' | 'Intermediate' | 'Advanced';
export type TradeResult = 'Win' | 'Loss';
export type Emotion = 'Calm' | 'Fear' | 'Greed' | 'Revenge' | 'Confident' | 'FOMO';
export type Duration = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | 'Daily';
export type AssetType = 'Currency' | 'Crypto' | 'Commodity';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  isVerified?: boolean;
  role: UserRole;
  currency?: 'USD' | 'INR';
  startingCapital?: number;
  currentCapital?: number;
  disciplineScore?: number;
  totalScore?: number;
  streak?: number;
  level?: Level;
  badges?: string[];
  isPro?: boolean;
  subscriptionExpiry?: any;
  isSuspicious?: boolean;
  photoURL?: string;
  createdAt?: any;
  // Pro Features
  riskLimits?: {
    maxRiskPerTrade: number; // percentage
    maxDailyLoss: number; // amount
    maxTradesPerDay: number;
  };
  performanceScore?: {
    discipline: number;
    risk: number;
    consistency: number;
    emotion: number;
    total: number;
  };
  focusMode?: boolean;
}

export interface Trade {
  id?: string;
  userId: string;
  assetType: AssetType;
  pair?: string;
  currentCapital: number;
  tradeAmount: number;
  percentage: number;
  result: TradeResult;
  emotion: Emotion;
  ruleFollowed: boolean;
  duration: Duration;
  capitalChange: number;
  timestamp: any;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: string;
}

export interface Signal {
  id?: string;
  pair: string;
  type: 'BUY' | 'SELL';
  entry: string;
  tp: string;
  sl: string;
  timestamp: any;
  active: boolean;
  adminId: string;
  adminName: string;
}
