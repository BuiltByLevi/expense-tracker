import React, { createContext, useState, useContext, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface EarningsContextType {
  earnings: number;
  setEarnings: (amount: number) => Promise<void>;
  loading: boolean;
}

const EarningsContext = createContext<EarningsContextType | undefined>(undefined);

export const useEarnings = () => {
  const context = useContext(EarningsContext);
  if (!context) {
    throw new Error('useEarnings must be used within an EarningsProvider');
  }
  return context;
};

export const EarningsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [earnings, setEarningsState] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadEarnings();
    } else {
      setEarningsState(0);
      setLoading(false);
    }
  }, [user]);

  const loadEarnings = async () => {
    if (!user) return;
    
    try {
      const earningsRef = doc(db, 'userSettings', user.uid);
      const earningsDoc = await getDoc(earningsRef);
      
      if (earningsDoc.exists()) {
        const data = earningsDoc.data();
        setEarningsState(data.monthlyEarnings || 0);
      } else {
        await setDoc(earningsRef, { 
          monthlyEarnings: 0, 
          updatedAt: new Date().toISOString() 
        });
        setEarningsState(0);
      }
    } catch (error) {
      console.error('Error loading earnings:', error);
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const setEarnings = async (amount: number) => {
    if (!user) {
      toast.error('No user logged in');
      return;
    }
    
    try {
      const earningsRef = doc(db, 'userSettings', user.uid);
      await setDoc(earningsRef, { 
        monthlyEarnings: amount, 
        updatedAt: new Date().toISOString() 
      }, { merge: true });
      
      setEarningsState(amount);
      toast.success('Earnings updated successfully!');
    } catch (error: any) {
      console.error('Error saving earnings:', error);
      toast.error(`Failed to save earnings: ${error.message}`);
      throw error;
    }
  };

  return (
    <EarningsContext.Provider value={{ earnings, setEarnings, loading }}>
      {children}
    </EarningsContext.Provider>
  );
};