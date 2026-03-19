/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { AuthScreen, VerificationScreen } from './AuthScreens';
import { Dashboard, Leaderboard } from './Dashboard';
import { ProFeatures, BadgesScreen, CommunityScreen } from './ProFeatures';
import { AdminPanel } from './AdminPanel';
import { 
  BarChart3, 
  Trophy, 
  BookOpen, 
  Users, 
  Settings,
  ShieldCheck,
  LogOut,
  User as UserIcon,
  Sparkles,
  ChevronRight,
  Menu as MenuIcon,
  X,
  Bell,
  Megaphone,
  CheckCircle2,
  Crown
} from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { PaymentSuccess, PaymentCancel } from './PaymentScreen';
import { doc, setDoc, updateDoc, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Modal, Input, Button, cn } from './components/UI';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';

type Tab = 'home' | 'rank' | 'learn' | 'social' | 'menu' | 'admin';

const MainApp: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [broadcast, setBroadcast] = useState<{ message: string, id: string } | null>(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  // Sync activeTab with URL path if needed, or just use it for the main tabs
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setActiveTab('home');
    else if (path === '/rank') setActiveTab('rank');
    else if (path === '/pro') setActiveTab('learn');
    else if (path === '/social') setActiveTab('social');
    else if (path === '/settings') setActiveTab('menu');
    else if (path === '/admin') setActiveTab('admin');
  }, [location.pathname]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
    switch (tab) {
      case 'home': navigate('/'); break;
      case 'rank': navigate('/rank'); break;
      case 'learn': navigate('/pro'); break;
      case 'social': navigate('/social'); break;
      case 'menu': navigate('/settings'); break;
      case 'admin': navigate('/admin'); break;
    }
  };

  useEffect(() => {
    if (!user) return;
    const broadcastsRef = collection(db, 'broadcasts');
    const q = query(broadcastsRef, where('active', '==', true), orderBy('timestamp', 'desc'), limit(1));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setBroadcast({ message: snapshot.docs[0].data().message, id: snapshot.docs[0].id });
      } else {
        setBroadcast(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-text-sub uppercase tracking-widest">X13 Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (profile?.role === 'unverified') {
    return <VerificationScreen />;
  }

  return (
    <div className="min-h-screen bg-background text-text-main">
      <Routes>
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />
        <Route path="*" element={
          <>
            {/* Top Navigation Bar */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border-dark px-4 flex items-center justify-between z-[60] shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black text-sm">X13</div>
                <span className="font-bold text-text-main tracking-tight">Trader</span>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleTabChange('learn')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all",
                    (profile?.isPro || profile?.role === 'admin') 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "bg-primary/10 text-primary border border-primary/20"
                  )}
                >
                  <Crown size={14} />
                  VIP
                </button>
                {broadcast && (
                  <button 
                    onClick={() => setIsBroadcastOpen(true)}
                    className="p-2 text-primary bg-primary/10 rounded-xl relative animate-pulse"
                  >
                    <Bell size={24} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-loss rounded-full border-2 border-card" />
                  </button>
                )}
                {profile?.photoURL && (
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-border-dark">
                    <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                )}
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 text-text-sub hover:bg-border-dark rounded-xl transition-colors"
                >
                  {isMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
                </button>
              </div>
            </header>

            {/* Side Menu Overlay */}
            {isMenuOpen && (
              <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] animate-in fade-in duration-200"
                onClick={() => setIsMenuOpen(false)}
              />
            )}

            {/* Side Menu */}
            <div className={cn(
              "fixed top-0 right-0 bottom-0 w-[280px] bg-card z-[56] shadow-2xl transition-transform duration-300 ease-out flex flex-col pt-20 border-l border-border-dark",
              isMenuOpen ? "translate-x-0" : "translate-x-full"
            )}>
              <div className="px-6 py-4 space-y-1">
                <MenuNavItem 
                  icon={BarChart3} 
                  label="Dashboard" 
                  active={activeTab === 'home'} 
                  onClick={() => handleTabChange('home')} 
                />
                <MenuNavItem 
                  icon={Trophy} 
                  label="Leaderboard" 
                  active={activeTab === 'rank'} 
                  onClick={() => handleTabChange('rank')} 
                />
                <MenuNavItem 
                  icon={BookOpen} 
                  label="VIP Section 👑" 
                  active={activeTab === 'learn'} 
                  onClick={() => handleTabChange('learn')} 
                />
                <MenuNavItem 
                  icon={Users} 
                  label="Community" 
                  active={activeTab === 'social'} 
                  onClick={() => handleTabChange('social')} 
                />
                <MenuNavItem 
                  icon={Settings} 
                  label="Settings" 
                  active={activeTab === 'menu'} 
                  onClick={() => handleTabChange('menu')} 
                />
                { (profile?.role === 'admin' || user?.email === 'anshv8707@gmail.com') && (
                  <MenuNavItem 
                    icon={ShieldCheck} 
                    label="Admin Panel" 
                    active={activeTab === 'admin'} 
                    onClick={() => handleTabChange('admin')} 
                  />
                )}
              </div>

              <div className="mt-auto p-6 border-t border-border-dark">
                <button 
                  onClick={() => signOut(auth)}
                  className="flex items-center gap-3 text-loss font-bold text-sm w-full p-3 rounded-xl hover:bg-loss/10 transition-colors"
                >
                  <LogOut size={18} />
                  Log Out
                </button>
              </div>
            </div>

            <main className="pt-16">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/rank" element={<Leaderboard />} />
                <Route path="/pro" element={<ProFeatures />} />
                <Route path="/social" element={<CommunityScreen />} />
                <Route path="/settings" element={<SettingsScreen handleTabChange={handleTabChange} />} />
                <Route path="/admin" element={<AdminPanel />} />
              </Routes>
            </main>

            {/* Broadcast Modal */}
            <Modal 
              isOpen={isBroadcastOpen} 
              onClose={() => setIsBroadcastOpen(false)} 
              title="X13 Broadcast"
            >
              {broadcast && (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-primary/20 text-primary rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <Megaphone size={32} />
                  </div>
                  <div className="bg-background p-6 rounded-2xl border border-border-dark">
                    <p className="text-text-main font-bold text-center leading-relaxed">
                      {broadcast.message}
                    </p>
                  </div>
                  <Button className="w-full h-12" onClick={() => setIsBroadcastOpen(false)}>
                    Understood
                  </Button>
                </div>
              )}
            </Modal>
          </>
        } />
      </Routes>
    </div>
  );
};

const MenuNavItem = ({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm",
      active 
        ? "bg-primary/10 text-primary" 
        : "text-text-sub hover:bg-border-dark hover:text-text-main"
    )}
  >
    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    {label}
  </button>
);

const SettingsScreen: React.FC<{ handleTabChange: (tab: Tab) => void }> = ({ handleTabChange }) => {
  const { user, profile } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [startingCapital, setStartingCapital] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Sync state with profile when modal opens
  useEffect(() => {
    if (isEditModalOpen && profile) {
      setDisplayName(profile.displayName || '');
      setStartingCapital(profile.startingCapital?.toString() || '0');
      setCurrency(profile.currency || 'USD');
      setPhotoURL(profile.photoURL || '');
    }
  }, [isEditModalOpen, profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // Limit to 500KB for Firestore
        alert("Image is too large. Please select an image under 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      const newStartingCapital = parseFloat(startingCapital) || 0;
      const updates: any = {
        displayName,
        startingCapital: newStartingCapital,
        currency,
        photoURL,
      };

      // If current capital is 0, initialize it to match starting capital
      if (!profile?.currentCapital || profile?.currentCapital === 0) {
        updates.currentCapital = newStartingCapital;
      }

      console.log("Updating profile with:", updates);
      await setDoc(userRef, updates, { merge: true });
      console.log("Profile updated successfully");
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsEditModalOpen(false);
      }, 1500);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-10 pt-6 px-4 space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-border-dark flex items-center justify-center text-text-sub font-bold text-2xl uppercase overflow-hidden border border-border-dark">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            profile?.displayName?.[0] || 'U'
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold text-text-main">{profile?.displayName}</h1>
            {profile?.role === 'verified' && <CheckCircle2 size={16} className="text-primary fill-primary/10" />}
          </div>
          <p className="text-sm text-text-sub font-medium">{profile?.email}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold text-text-sub uppercase tracking-widest">Account</h2>
        <div className="space-y-2">
          <SettingsItem icon={UserIcon} label="Profile Settings" onClick={() => setIsEditModalOpen(true)} />
          <SettingsItem icon={ShieldCheck} label="Security & Privacy" />
          <SettingsItem icon={Sparkles} label="Upgrade to Pro" onClick={() => handleTabChange('learn')} />
          <SettingsItem icon={LogOut} label="Log Out" variant="danger" onClick={() => signOut(auth)} />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold text-text-sub uppercase tracking-widest">App</h2>
        <div className="space-y-2">
          <SettingsItem icon={Settings} label="Notifications" />
          <SettingsItem icon={Settings} label="Help & Support" />
          <SettingsItem icon={Settings} label="About X13 Trader" />
        </div>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Profile">
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-text-sub">Profile Picture</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-background flex items-center justify-center overflow-hidden border border-border-dark">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="text-text-sub" size={32} />
                )}
              </div>
              <div className="space-y-2">
                <label className="cursor-pointer bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-colors inline-block">
                  Upload Photo
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                </label>
                {photoURL && (
                  <button 
                    type="button"
                    onClick={() => setPhotoURL('')}
                    className="block text-xs font-bold text-loss hover:opacity-80"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-text-sub font-medium">Max size: 500KB. Recommended: Square image.</p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-text-sub">Display Name</label>
            <Input 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
              className="h-12 font-bold"
            />
          </div>
          <div className="space-y-3">
            <label className="text-sm font-bold text-text-sub">Currency</label>
            <div className="grid grid-cols-2 gap-2">
              {(['USD', 'INR'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={cn(
                    "py-2.5 rounded-xl border font-semibold text-xs transition-all",
                    currency === c 
                      ? "bg-primary border-primary text-white"
                      : "bg-background border-border-dark text-text-sub hover:bg-border-dark"
                  )}
                >
                  {c === 'USD' ? 'USD ($)' : 'INR (₹)'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-bold text-text-sub">Starting Capital</label>
            <Input 
              type="number"
              value={startingCapital}
              onChange={(e) => setStartingCapital(e.target.value)}
              placeholder="1000.00"
              className="h-12 font-bold"
            />
          </div>
          <Button type="submit" className="w-full h-12" disabled={loading || success}>
            {loading ? 'Saving...' : success ? 'Saved!' : 'Save Changes'}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

const SettingsItem = ({ icon: Icon, label, variant = 'default', onClick }: { icon: any, label: string, variant?: 'default' | 'danger', onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full p-4 rounded-2xl flex items-center justify-between transition-colors",
      variant === 'danger' ? "bg-loss/10 text-loss hover:bg-loss/20" : "bg-card text-text-main hover:bg-border-dark border border-border-dark"
    )}
  >
    <div className="flex items-center gap-3">
      <Icon size={20} />
      <span className="text-sm font-bold">{label}</span>
    </div>
    <ChevronRight size={18} className="text-text-sub" />
  </button>
);

import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
