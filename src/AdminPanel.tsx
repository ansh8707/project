import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  limit,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  writeBatch,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, Trade, Challenge } from './types';
import { Card, Button, Input, Modal, cn } from './components/UI';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  ShieldAlert, 
  Search, 
  ChevronRight, 
  Trash2,
  CheckCircle2,
  XCircle,
  BarChart3,
  Megaphone,
  Trophy,
  AlertTriangle,
  Zap,
  Clock,
  Filter,
  RefreshCw,
  Crown
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userTrades, setUserTrades] = useState<Trade[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'challenges' | 'broadcast' | 'fraud' | 'subs' | 'signals'>('users');
  
  // Broadcast State
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Challenge State
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [newChallenge, setNewChallenge] = useState({ title: '', description: '', reward: 10, type: 'daily' });

  // Signals State
  const [signals, setSignals] = useState<any[]>([]);
  const [newSignal, setNewSignal] = useState({
    pair: '',
    type: 'BUY',
    entry: '',
    tp: '',
    sl: '',
    active: true
  });
  const [isSignalLoading, setIsSignalLoading] = useState(false);

  useEffect(() => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('totalScore', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      })) as UserProfile[];
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    // Fetch challenges
    const challengesRef = collection(db, 'challenges');
    const unsubscribeChallenges = onSnapshot(challengesRef, (snapshot) => {
      setChallenges(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Challenge));
    });

    // Fetch signals
    const signalsRef = collection(db, 'signals');
    const qSignals = query(signalsRef, orderBy('timestamp', 'desc'), limit(20));
    const unsubscribeSignals = onSnapshot(qSignals, (snapshot) => {
      setSignals(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    return () => {
      unsubscribe();
      unsubscribeChallenges();
      unsubscribeSignals();
    };
  }, []);

  const fetchUserTrades = async (userId: string) => {
    try {
      const tradesRef = collection(db, `users/${userId}/trades`);
      const q = query(tradesRef, orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const tradesData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Trade[];
      setUserTrades(tradesData);
    } catch (error) {
      console.error("Error fetching user trades:", error);
    }
  };

  const handleUserClick = (user: UserProfile) => {
    setSelectedUser(user);
    fetchUserTrades(user.uid);
    setIsUserModalOpen(true);
  };

  const toggleAdmin = async (user: UserProfile) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const newRole = user.role === 'admin' ? 'verified' : 'admin';
      await updateDoc(userRef, { role: newRole });
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  const toggleSuspicious = async (user: UserProfile) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { isSuspicious: !user.isSuspicious });
      setSelectedUser(prev => prev ? { ...prev, isSuspicious: !prev.isSuspicious } : null);
    } catch (error) {
      console.error("Error updating suspicious status:", error);
    }
  };

  const resetLeaderboard = async () => {
    // Removed window.confirm as it doesn't work in iframes
    try {
      const batch = writeBatch(db);
      users.forEach(u => {
        const userRef = doc(db, 'users', u.uid);
        batch.update(userRef, { totalScore: 0, disciplineScore: 0, streak: 0 });
      });
      await batch.commit();
      alert("Leaderboard reset successfully!");
    } catch (error) {
      console.error("Error resetting leaderboard:", error);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    setIsBroadcasting(true);
    try {
      // Deactivate previous broadcasts first
      const broadcastsRef = collection(db, 'broadcasts');
      const q = query(broadcastsRef, where('active', '==', true));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => {
        batch.update(d.ref, { active: false });
      });
      
      // Add new broadcast
      const newBroadcastRef = doc(collection(db, 'broadcasts'));
      batch.set(newBroadcastRef, {
        message: broadcastMessage,
        timestamp: serverTimestamp(),
        active: true
      });
      
      await batch.commit();
      setBroadcastMessage('');
      alert("Broadcast sent successfully!");
    } catch (error) {
      console.error("Error sending broadcast:", error);
      handleFirestoreError(error, OperationType.WRITE, 'broadcasts');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const addChallenge = async () => {
    if (!newChallenge.title || !newChallenge.description) return;
    try {
      await addDoc(collection(db, 'challenges'), newChallenge);
      setNewChallenge({ title: '', description: '', reward: 10, type: 'daily' });
    } catch (error) {
      console.error("Error adding challenge:", error);
    }
  };

  const handleAddSignal = async () => {
    if (!newSignal.pair || !newSignal.entry || !newSignal.tp || !newSignal.sl) return;
    setIsSignalLoading(true);
    try {
      const { user, profile } = (window as any).authContextValue || {}; // Hacky way if not using context directly, but better to use useAuth
      await addDoc(collection(db, 'signals'), {
        ...newSignal,
        timestamp: serverTimestamp(),
        adminId: user?.uid || 'system',
        adminName: profile?.displayName || 'Admin'
      });
      setNewSignal({ pair: '', type: 'BUY', entry: '', tp: '', sl: '', active: true });
      alert("Signal posted successfully!");
    } catch (error) {
      console.error("Error adding signal:", error);
    } finally {
      setIsSignalLoading(false);
    }
  };

  const deleteSignal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'signals', id));
    } catch (error) {
      console.error("Error deleting signal:", error);
    }
  };

  const deleteChallenge = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'challenges', id));
    } catch (error) {
      console.error("Error deleting challenge:", error);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fraud Detection Logic
  const suspiciousUsers = users.filter(u => {
    const growth = u.startingCapital ? ((u.currentCapital || 0) - u.startingCapital) / u.startingCapital * 100 : 0;
    return growth > 500 || u.isSuspicious; // Mark as suspicious if growth > 500% or manually flagged
  });

  const totalCapital = users.reduce((acc, u) => acc + (u.currentCapital || 0), 0);
  const proUsersCount = users.filter(u => u.isPro).length;
  
  // Estimate active today (users with at least one trade in the last 24h)
  // For now, we'll just show users who have a discipline score > 0 as a proxy if we don't want to fetch all trades
  const activeToday = users.filter(u => u.disciplineScore && u.disciplineScore > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-24 pt-6 px-4 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-main tracking-tight">X13 Command Center</h1>
          <p className="text-sm font-bold text-text-sub uppercase tracking-wider">System Administrator</p>
        </div>
        <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5">
          <Shield size={14} />
          ADMIN MODE
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Users" value={users.length} icon={Users} />
        <StatCard label="Active Today" value={activeToday} icon={Zap} color="text-emerald-600" />
        <StatCard label="Global Capital" value={`$${(totalCapital/1000).toFixed(1)}k`} icon={TrendingUp} />
        <StatCard label="Fraud Alerts" value={suspiciousUsers.length} icon={ShieldAlert} color="text-red-500" />
      </div>

      {/* Admin Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Users" />
        <TabButton active={activeTab === 'challenges'} onClick={() => setActiveTab('challenges')} icon={Trophy} label="Challenges" />
        <TabButton active={activeTab === 'broadcast'} onClick={() => setActiveTab('broadcast')} icon={Megaphone} label="Broadcast" />
        <TabButton active={activeTab === 'fraud'} onClick={() => setActiveTab('fraud')} icon={ShieldAlert} label="Fraud Detection" />
        <TabButton active={activeTab === 'subs'} onClick={() => setActiveTab('subs')} icon={Crown} label="Subscriptions" />
        <TabButton active={activeTab === 'signals'} onClick={() => setActiveTab('signals')} icon={Zap} label="VIP Signals" />
      </div>

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-sub" />
              <Input 
                placeholder="Search traders..." 
                className="pl-12 h-12 font-bold bg-background border-border-dark"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="h-12 px-4" onClick={resetLeaderboard}>
              <RefreshCw size={18} />
            </Button>
          </div>

          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <UserListItem key={user.uid} user={user} onClick={() => handleUserClick(user)} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'challenges' && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-black text-text-main uppercase tracking-widest">Create New Challenge</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input 
                placeholder="Challenge Title" 
                value={newChallenge.title} 
                onChange={e => setNewChallenge({...newChallenge, title: e.target.value})}
              />
              <Input 
                type="number" 
                placeholder="Reward Points" 
                value={newChallenge.reward} 
                onChange={e => setNewChallenge({...newChallenge, reward: parseInt(e.target.value)})}
              />
              <select 
                className="h-10 px-3 rounded-xl border border-border-dark bg-background text-sm font-bold text-text-main"
                value={newChallenge.type}
                onChange={e => setNewChallenge({...newChallenge, type: e.target.value})}
              >
                <option value="daily">Daily Challenge</option>
                <option value="weekly">Weekly Challenge</option>
                <option value="special">Special Event</option>
              </select>
              <Input 
                placeholder="Description" 
                value={newChallenge.description} 
                onChange={e => setNewChallenge({...newChallenge, description: e.target.value})}
              />
            </div>
            <Button className="w-full" onClick={addChallenge}>Add Challenge</Button>
          </Card>

          <div className="space-y-3">
            {challenges.map(c => (
              <Card key={c.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">{c.type}</span>
                    <h4 className="text-sm font-bold text-text-main">{c.title}</h4>
                  </div>
                  <p className="text-xs text-text-sub">{c.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-black text-emerald-600">+{c.reward}</span>
                  <button onClick={() => deleteChallenge(c.id)} className="text-loss hover:opacity-80">
                    <Trash2 size={18} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'broadcast' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Megaphone className="text-emerald-500" />
            <h3 className="text-lg font-black text-text-main">Global Broadcast</h3>
          </div>
          <p className="text-sm text-text-sub font-medium">Send a message to all active users. This will appear on their dashboard.</p>
          <textarea 
            className="w-full h-32 p-4 rounded-2xl border border-border-dark bg-background font-bold text-sm text-text-main focus:ring-2 focus:ring-primary outline-none"
            placeholder="e.g., Today market is highly volatile. Trade with low risk!"
            value={broadcastMessage}
            onChange={e => setBroadcastMessage(e.target.value)}
          />
          <Button className="w-full h-12" onClick={handleBroadcast} disabled={isBroadcasting}>
            {isBroadcasting ? 'Sending...' : 'Send Broadcast Message'}
          </Button>
        </Card>
      )}

      {activeTab === 'fraud' && (
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="text-loss" />
            <p className="text-xs font-bold text-loss">Detecting unrealistic growth (&gt;500%) and over-trading patterns.</p>
          </div>
          <div className="space-y-3">
            {suspiciousUsers.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-3xl border border-dashed border-border-dark">
                <Shield className="mx-auto text-text-sub/30 mb-2" size={40} />
                <p className="text-sm font-bold text-text-sub">No suspicious activity detected.</p>
              </div>
            ) : (
              suspiciousUsers.map(u => (
                <UserListItem key={u.uid} user={u} onClick={() => handleUserClick(u)} isAlert />
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'signals' && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-black text-text-main uppercase tracking-widest">Post VIP Signal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input 
                placeholder="Pair (e.g. BTC/USD)" 
                value={newSignal.pair} 
                onChange={e => setNewSignal({...newSignal, pair: e.target.value})}
              />
              <select 
                className="h-10 px-3 rounded-xl border border-border-dark bg-background text-sm font-bold text-text-main"
                value={newSignal.type}
                onChange={e => setNewSignal({...newSignal, type: e.target.value as any})}
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
              <Input 
                placeholder="Entry Price" 
                value={newSignal.entry} 
                onChange={e => setNewSignal({...newSignal, entry: e.target.value})}
              />
              <Input 
                placeholder="Take Profit" 
                value={newSignal.tp} 
                onChange={e => setNewSignal({...newSignal, tp: e.target.value})}
              />
              <Input 
                placeholder="Stop Loss" 
                value={newSignal.sl} 
                onChange={e => setNewSignal({...newSignal, sl: e.target.value})}
              />
            </div>
            <Button className="w-full h-12" onClick={handleAddSignal} disabled={isSignalLoading}>
              {isSignalLoading ? 'Posting...' : 'Post Signal'}
            </Button>
          </Card>

          <div className="space-y-3">
            <h3 className="text-xs font-black text-text-sub uppercase tracking-widest">Active Signals</h3>
            {signals.map(s => (
              <Card key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                      s.type === 'BUY' ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
                    )}>{s.type}</span>
                    <h4 className="text-sm font-bold text-text-main">{s.pair}</h4>
                  </div>
                  <p className="text-[10px] text-text-sub font-medium">Entry: {s.entry} | TP: {s.tp} | SL: {s.sl}</p>
                </div>
                <button onClick={() => deleteSignal(s.id)} className="text-loss hover:opacity-80 p-2">
                  <Trash2 size={18} />
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Trader Profile">
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-3xl bg-background overflow-hidden border border-border-dark">
                {selectedUser.photoURL ? <img src={selectedUser.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-text-sub">{selectedUser.displayName?.[0]}</div>}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xl font-black text-text-main">{selectedUser.displayName}</h2>
                  {selectedUser.role === 'verified' && <CheckCircle2 size={18} className="text-primary fill-primary/10" />}
                </div>
                <p className="text-sm text-text-sub font-medium">{selectedUser.email}</p>
                <div className="flex gap-2 mt-2">
                  {selectedUser.isSuspicious && <span className="px-2 py-0.5 bg-loss/10 text-loss text-[10px] font-black rounded-full">SUSPICIOUS</span>}
                  {selectedUser.isPro && <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-black rounded-full">PRO</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailCard label="Growth" value={`${(((selectedUser.currentCapital || 0) - (selectedUser.startingCapital || 0)) / (selectedUser.startingCapital || 1) * 100).toFixed(1)}%`} />
              <DetailCard label="Discipline" value={selectedUser.disciplineScore || 0} />
              <DetailCard label="Streak" value={selectedUser.streak || 0} />
              <DetailCard label="Level" value={selectedUser.level || 'Beginner'} />
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black text-text-sub uppercase tracking-widest">Admin Actions</h3>
              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" className="justify-start gap-3" onClick={() => toggleAdmin(selectedUser)}>
                  <Shield size={18} /> {selectedUser.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                </Button>
                <Button variant="outline" className={cn("justify-start gap-3", selectedUser.isSuspicious ? "text-profit" : "text-loss")} onClick={() => toggleSuspicious(selectedUser)}>
                  <ShieldAlert size={18} /> {selectedUser.isSuspicious ? 'Mark as Safe' : 'Mark as Suspicious'}
                </Button>
                <Button variant="ghost" className="justify-start gap-3 text-loss hover:bg-loss/10" onClick={() => { deleteDoc(doc(db, 'users', selectedUser.uid)) }}>
                  <Trash2 size={18} /> Delete Account
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color = "text-text-main" }: any) => (
  <Card className="p-4 space-y-1">
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-black text-text-sub uppercase tracking-widest">{label}</p>
      <Icon size={14} className="text-text-sub/30" />
    </div>
    <p className={cn("text-xl font-black", color)}>{value}</p>
  </Card>
);

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap",
      active ? "bg-primary text-white shadow-lg" : "bg-card text-text-sub border border-border-dark hover:bg-border-dark"
    )}
  >
    <Icon size={16} />
    {label}
  </button>
);

const UserListItem = ({ user, onClick, isAlert = false }: any) => (
  <Card 
    className={cn(
      "p-4 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-all",
      isAlert ? "border-loss/20 bg-loss/5" : "bg-card border-border-dark"
    )}
    onClick={onClick}
  >
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-background overflow-hidden border border-border-dark">
        {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-text-sub">{user.displayName?.[0]}</div>}
      </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-text-main">{user.displayName}</h4>
                  {user.role === 'verified' && <CheckCircle2 size={14} className="text-primary fill-primary/10" />}
                </div>
                <p className="text-[10px] text-text-sub font-medium">{user.email}</p>
              </div>
    </div>
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-[10px] font-bold text-text-sub uppercase">Score</p>
        <p className="text-sm font-black text-profit">{user.totalScore}</p>
      </div>
      <ChevronRight size={18} className="text-text-sub/30" />
    </div>
  </Card>
);

const DetailCard = ({ label, value }: any) => (
  <div className="p-4 bg-background rounded-2xl border border-border-dark">
    <p className="text-[10px] font-black text-text-sub uppercase tracking-widest">{label}</p>
    <p className="text-lg font-black text-text-main">{value}</p>
  </div>
);
