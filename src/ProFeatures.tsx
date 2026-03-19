import React, { useState } from 'react';
import { Card, Button, cn } from './components/UI';
import { 
  Lock, 
  Sparkles, 
  BarChart3, 
  BookOpen, 
  Zap, 
  Shield, 
  AlertTriangle, 
  Lightbulb,
  CheckCircle2,
  Trophy,
  ArrowRight,
  MessageCircle,
  Loader2,
  Brain,
  Calculator,
  EyeOff,
  Crown
} from 'lucide-react';
import Markdown from 'react-markdown';
import { useAuth } from './AuthContext';

import { ProDashboard } from './ProDashboard';

export const ProFeatures: React.FC = () => {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const currencySymbol = profile?.currency === 'INR' ? '₹' : '$';

  const handleUpgrade = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      // Removed alert as it doesn't work in iframes
    } finally {
      setLoading(false);
    }
  };

  if (profile?.isPro || profile?.role === 'admin') {
    return <ProDashboard />;
  }

  return (
    <div className="pb-10 pt-6 px-4 space-y-8 max-w-2xl mx-auto">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary text-white shadow-xl shadow-primary/20 mb-2">
          <Sparkles size={32} />
        </div>
        <h1 className="text-3xl font-bold text-text-main tracking-tight">X13 VIP Section 👑</h1>
        <p className="text-text-sub font-medium">Unlock advanced tools for professional traders.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {[
          { title: 'Smart Insights Engine', desc: 'Light AI detects revenge trading and overtrading patterns.', icon: Brain },
          { title: 'Advanced Growth Analytics', desc: 'Weekly/Monthly growth % and J-curve tracking.', icon: BarChart3 },
          { title: 'Risk Control System', desc: 'Set max daily loss and risk per trade alerts.', icon: Shield },
          { title: 'Money Management Engine', desc: 'Auto-calculated position sizing based on capital.', icon: Calculator },
          { title: 'Elite Strategy Library', desc: 'Access high-probability entry and exit rules.', icon: BookOpen },
          { title: 'Focus Mode', desc: 'Block emotional trades and stick to your rules.', icon: EyeOff },
          { title: 'Verified VIP Status', desc: 'Get a Golden Crown badge on your profile and leaderboard.', icon: Crown },
        ].map((feature, i) => (
          <Card key={i} className="p-6 flex items-start gap-5 border-border-dark hover:border-primary/30 transition-all group">
            <div className="p-3 rounded-2xl bg-background text-text-sub group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <feature.icon size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-text-main">{feature.title}</h3>
              <p className="text-sm text-text-sub font-medium">{feature.desc}</p>
            </div>
          </Card>
        ))}
      </div>

      <Button 
        onClick={handleUpgrade} 
        disabled={loading}
        className="w-full h-16 text-lg font-bold shadow-xl shadow-primary/20"
      >
        {loading ? (
          <Loader2 className="animate-spin mr-2" size={20} />
        ) : (
          <>
            Upgrade to X13 Pro — {currencySymbol}19/mo
            <ArrowRight className="ml-2" size={20} />
          </>
        )}
      </Button>
    </div>
  );
};

const ChevronRight = ({ size, className }: { size: number, className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

export const BadgesScreen: React.FC = () => {
  const { profile } = useAuth();
  
  const tiers = [
    { name: 'Beginner', color: 'text-sub', bg: 'bg-card' },
    { name: 'Intermediate', color: 'text-profit', bg: 'bg-profit/10' },
    { name: 'Advanced', color: 'text-primary', bg: 'bg-primary/10' },
  ];

  return (
    <div className="pb-10 pt-6 px-4 space-y-8 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <Trophy size={48} className="mx-auto text-primary mb-2" />
        <h1 className="text-2xl font-bold text-main">Badge Showcase</h1>
        <p className="text-sm text-sub">Collect them all to prove your mastery.</p>
      </div>

      {tiers.map((tier) => (
        <div key={tier.name} className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className={cn("text-sm font-black uppercase tracking-widest", tier.color)}>{tier.name} Badges</h2>
            <div className="flex-1 h-px bg-dark" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center shadow-sm border-2 border-dark transition-all", profile?.badges?.includes(`${tier.name}-${i}`) ? tier.bg : "bg-card grayscale opacity-40")}>
                  <Shield size={32} className={profile?.badges?.includes(`${tier.name}-${i}`) ? tier.color : "text-sub/30"} />
                </div>
                <span className="text-[10px] font-bold text-sub text-center uppercase leading-tight">
                  {tier.name} {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const CommunityScreen: React.FC = () => {
  return (
    <div className="pb-10 pt-6 px-4 space-y-8 max-w-2xl mx-auto">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary text-white shadow-xl shadow-primary/20 mb-2">
          <MessageCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold text-main tracking-tight">X13 Community</h1>
        <p className="text-sub font-medium">Join 5,000+ traders in our Telegram group.</p>
      </div>

      <Card className="p-8 text-center space-y-6 border-primary/20 bg-primary/5">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-main">Join the Discussion</h2>
          <p className="text-sm text-sub font-medium">Get daily tips, market insights, and connect with fellow traders.</p>
        </div>
        <Button className="w-full h-14 shadow-lg shadow-primary/20">
          Join Telegram Group
          <ArrowRight className="ml-2" size={20} />
        </Button>
      </Card>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-sub uppercase tracking-widest">Recent Tips</h3>
        {[
          'Never risk more than 2% per trade.',
          'A loss is just data. Don\'t take it personally.',
          'Discipline is the only edge that lasts forever.',
        ].map((tip, i) => (
          <Card key={i} className="p-4 flex items-center gap-4">
            <div className="p-2 bg-background text-sub rounded-xl">
              <Zap size={16} />
            </div>
            <p className="text-sm font-medium text-main">{tip}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};
