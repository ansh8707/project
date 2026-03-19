import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { Button, Card, Input } from './components/UI';
import { useAuth } from './AuthContext';
import { UserProfile } from './types';
import { LogIn, UserPlus, ShieldCheck, Mail, Phone, ArrowRight, LogOut, User as UserIcon, Chrome, Zap, Lock, AlertCircle, Crown } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isVIP, setIsVIP] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if profile exists
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || 'Trader',
          role: 'verified', // Google users are pre-verified
          isVerified: true,
          disciplineScore: 0,
          totalScore: 0,
          streak: 0,
          level: 'Beginner',
          badges: [],
          isPro: isVIP,
          createdAt: serverTimestamp(),
        };
        await setDoc(docRef, profile);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        console.log("Attempting login for:", email);
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        console.log("Attempting signup for:", email);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("User created in Auth:", user.uid);

        try {
          await updateProfile(user, { displayName });
          console.log("Profile updated with displayName:", displayName);
        } catch (profileErr) {
          console.error("Error updating Auth profile:", profileErr);
          // Continue anyway, we can fix this later
        }

        const profile: UserProfile = {
          uid: user.uid,
          email: user.email!,
          displayName,
          role: 'verified', // Changed from unverified to verified to avoid blocking
          isVerified: true,
          disciplineScore: 0,
          totalScore: 0,
          streak: 0,
          level: 'Beginner',
          badges: [],
          isPro: isVIP,
          createdAt: serverTimestamp(),
        };

        console.log("Creating Firestore profile:", profile);
        await setDoc(doc(db, 'users', user.uid), profile);
        console.log("Firestore profile created successfully");
        
        try {
          await sendEmailVerification(user);
          console.log("Verification email sent");
        } catch (emailErr) {
          console.error("Error sending verification email:", emailErr);
          // Continue anyway
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is disabled. Please enable it in Firebase Console (Authentication -> Sign-in method).');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use. Please sign in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else if (err.message.includes('permission-denied')) {
        setError('Database permission denied. Please contact support.');
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Background Glows */}
      <div className={cn(
        "absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-all duration-1000 opacity-20",
        isVIP ? "bg-amber-500" : "bg-primary"
      )} />
      <div className={cn(
        "absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-all duration-1000 opacity-20",
        isVIP ? "bg-amber-500" : "bg-primary"
      )} />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-2">
          {isVIP ? (
            <div className="animate-in fade-in zoom-in duration-700">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2.5rem] bg-amber-500 text-white shadow-[0_0_40px_rgba(245,158,11,0.4)] mb-6 transform rotate-3 border-4 border-white/20">
                <Crown size={48} fill="currentColor" />
              </div>
              <h1 className="text-5xl font-black text-amber-500 tracking-tighter uppercase italic">VIP HUB</h1>
              <p className="text-amber-500/80 font-black text-xs uppercase tracking-[0.4em]">Elite Access Only</p>
            </div>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2.5rem] bg-primary text-white shadow-2xl shadow-primary/30 mb-6 transform hover:rotate-12 transition-all duration-700">
                <ShieldCheck size={40} />
              </div>
              <h1 className="text-4xl font-black text-text-main tracking-tighter uppercase">X13 Trader</h1>
              <p className="text-text-sub font-bold text-sm uppercase tracking-widest opacity-60">Emotional Control Protocol</p>
            </>
          )}
        </div>

        {/* Mode Switcher Tabs */}
        <div className={cn(
          "flex p-1 rounded-2xl shadow-xl transition-all duration-500",
          isVIP ? "bg-amber-500/10 border border-amber-500/30" : "bg-card border border-border-dark"
        )}>
          <button
            onClick={() => setIsVIP(false)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              !isVIP ? "bg-background text-primary shadow-sm border border-border-dark" : "text-text-sub hover:text-text-main"
            )}
          >
            <UserIcon size={14} />
            Standard
          </button>
          <button
            onClick={() => setIsVIP(true)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              isVIP ? "bg-amber-500 text-white shadow-lg shadow-amber-500/40" : "text-text-sub hover:text-amber-500"
            )}
          >
            <Crown size={14} fill={isVIP ? "currentColor" : "none"} />
            VIP Hub
          </button>
        </div>

        <Card className={cn(
          "p-8 border-2 transition-all duration-700 shadow-2xl",
          isVIP ? "border-amber-500/40 bg-amber-500/[0.03] shadow-amber-500/5" : "border-dark shadow-black/5"
        )}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-xs font-black text-sub uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-sub w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="John Doe"
                    className="pl-10"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-black text-sub uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-sub w-4 h-4" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-sub uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-sub w-4 h-4" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {isVIP && isLogin && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-500">
                <label className="text-xs font-black text-amber-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                  <Zap size={10} fill="currentColor" /> VIP Access Key
                </label>
                <div className="relative">
                  <Crown className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="X13-VIP-XXXX"
                    className="pl-10 border-amber-500/30 focus:border-amber-500 bg-amber-500/5 text-amber-500 placeholder:text-amber-500/30 font-mono"
                  />
                </div>
                <p className="text-[10px] text-amber-500/60 font-medium italic">Leave blank if you are a verified VIP member.</p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-loss/10 border border-loss/20 rounded-xl flex items-center gap-2 text-loss text-xs font-bold">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className={cn(
                "w-full h-12 text-base",
                isVIP && "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
              )} 
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isLogin ? (isVIP ? 'Enter VIP Terminal' : 'Sign In') : 'Create Account'
              )}
              {!loading && <ArrowRight className="ml-2" size={18} />}
            </Button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-sub font-bold">Or continue with</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-12 text-base" 
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <Chrome className="mr-2" size={18} />
              Google
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-dark text-center flex flex-col gap-4">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-semibold text-primary hover:opacity-80 transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </Card>

        <div className="text-center">
          <p className="text-sm text-sub">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export const VerificationScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (otp !== '123456') { // Mock OTP for demo
      setError('Invalid verification code. Try 123456');
      return;
    }

    setLoading(true);
    try {
      await setDoc(doc(db, 'users', user!.uid), {
        role: 'verified',
        isVerified: true
      }, { merge: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md p-8 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-2">
          <Mail size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-main">Verify your account</h2>
          <p className="text-sub">We've sent a verification code to {user?.email}</p>
        </div>

        <div className="space-y-4">
          <Input
            type="text"
            placeholder="Enter 6-digit code"
            className="text-center text-2xl tracking-[1em] h-14"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          {error && <p className="text-sm text-loss font-medium">{error}</p>}
          <Button className="w-full h-12" onClick={handleVerify} disabled={loading}>
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </Button>
        </div>

        <button 
          onClick={() => signOut(auth)}
          className="text-sm font-semibold text-sub hover:text-main"
        >
          Sign out and try another email
        </button>
      </Card>
    </div>
  );
};
