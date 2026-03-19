import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Button } from './components/UI';
import { CheckCircle2, XCircle, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';

export const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!user || !sessionId) {
        setStatus('error');
        return;
      }

      try {
        // In a real app, you'd verify the session with Stripe on the backend
        // and use a webhook to update the database.
        // For this demo, we'll update the profile directly if we have a session ID.
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          isPro: true,
          proActivatedAt: new Date().toISOString()
        });
        setStatus('success');
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
      }
    };

    verifyPayment();
  }, [user, sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md p-8 text-center space-y-6">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-main">Verifying Payment</h2>
              <p className="text-sub text-sm">Please wait while we activate your Elite features...</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-profit/10 text-profit rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-profit/10">
              <Sparkles size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-main">Welcome to X13 Elite!</h2>
              <p className="text-sub text-sm">Your pro features have been activated. Time to trade like a pro.</p>
            </div>
            <Button onClick={() => navigate('/')} className="w-full h-12">
              Go to Dashboard
              <ArrowRight className="ml-2" size={18} />
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-loss/10 text-loss rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-loss/10">
              <XCircle size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-main">Payment Error</h2>
              <p className="text-sub text-sm">We couldn't verify your payment. If you were charged, please contact support.</p>
            </div>
            <Button onClick={() => navigate('/pro')} variant="outline" className="w-full h-12">
              Try Again
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export const PaymentCancel: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-sub/10 text-sub rounded-3xl flex items-center justify-center mx-auto">
          <XCircle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-main">Payment Cancelled</h2>
          <p className="text-sub text-sm">Your payment was cancelled. No charges were made.</p>
        </div>
        <Button onClick={() => navigate('/pro')} className="w-full h-12">
          Back to Pro Features
        </Button>
      </Card>
    </div>
  );
};
