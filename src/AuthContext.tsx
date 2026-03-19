import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile } from './types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAuthReady: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        try {
          // Ensure profile exists
          const profileRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(profileRef);
          
          if (!docSnap.exists()) {
            const isAdminEmail = currentUser.email === "anshv8707@gmail.com";
            
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Trader',
              role: isAdminEmail ? 'admin' : 'verified',
              isVerified: true,
              currency: 'USD',
              disciplineScore: 0,
              totalScore: 0,
              streak: 0,
              level: 'Beginner',
              badges: [],
              isPro: false,
              startingCapital: 0,
              currentCapital: 0,
              createdAt: serverTimestamp(),
            };
            console.log("Creating new profile in AuthContext:", newProfile);
            await setDoc(profileRef, newProfile);
            
            // Sync to public profile
            const publicRef = doc(db, 'users_public', currentUser.uid);
            await setDoc(publicRef, {
              uid: currentUser.uid,
              displayName: newProfile.displayName,
              totalScore: 0,
              streak: 0,
              level: 'Beginner',
              isPro: false,
              photoURL: currentUser.photoURL || '',
              updatedAt: serverTimestamp()
            });
          } else {
            // If profile exists but role is not admin for the admin email, update it
            const data = docSnap.data() as UserProfile;
            if (currentUser.email === "anshv8707@gmail.com" && data.role !== 'admin') {
              await setDoc(profileRef, { role: 'admin' }, { merge: true });
            }
            
            // Ensure public profile exists and is synced
            const publicRef = doc(db, 'users_public', currentUser.uid);
            const publicSnap = await getDoc(publicRef);
            if (!publicSnap.exists()) {
              await setDoc(publicRef, {
                uid: data.uid,
                displayName: data.displayName || 'Trader',
                totalScore: data.totalScore || 0,
                streak: data.streak || 0,
                level: data.level || 'Beginner',
                isPro: data.isPro || false,
                photoURL: data.photoURL || '',
                updatedAt: serverTimestamp()
              });
            }
          }
        } catch (err) {
          console.error("Error in AuthProvider profile check:", err);
          // If we can't create/check profile, we should still stop loading
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const profileRef = doc(db, 'users', user.uid);
    const unsubscribeProfile = onSnapshot(
      profileRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          console.log("Profile loaded:", data);
          setProfile(data);
          
          // Sync to public profile
          const publicRef = doc(db, 'users_public', user.uid);
          const growthPercent = data.startingCapital ? ((data.currentCapital || 0) - data.startingCapital) / data.startingCapital * 100 : 0;
          
          await setDoc(publicRef, {
            uid: data.uid,
            displayName: data.displayName || 'Trader',
            totalScore: data.totalScore || 0,
            streak: data.streak || 0,
            level: data.level || 'Beginner',
            isPro: data.isPro || false,
            photoURL: data.photoURL || '',
            growthPercent: growthPercent,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        setLoading(false);
      }
    );

    return () => unsubscribeProfile();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
};
