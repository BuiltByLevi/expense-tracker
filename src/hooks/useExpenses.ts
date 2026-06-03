import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import type { Expense, CategoryTotal } from '../types';

export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadExpenses = async () => {
    if (!user) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      const q = query(
        collection(db, 'expenses'),
        where('userid', '==', user.uid)
      );
      
      const snapshot = await getDocs(q);
      
      const expensesData: Expense[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        expensesData.push({
          id: doc.id,
          amount: data.amount,
          category: data.category,
          description: data.description,
          date: new Date(data.date),
          userId: data.userid
        } as Expense);
      });
      
      expensesData.sort((a, b) => b.date.getTime() - a.date.getTime());
      setExpenses(expensesData);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [user]);

  const addExpense = async (expense: Omit<Expense, 'id' | 'userId'>) => {
    if (!user) return;
    
    try {
      await addDoc(collection(db, 'expenses'), {
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        userid: user.uid,
        date: expense.date.toISOString()
      });
      
      await loadExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  };

  const updateExpense = async (id: string, updatedData: Partial<Expense>) => {
    if (!user) return;
    
    try {
      const expenseRef = doc(db, 'expenses', id);
      await updateDoc(expenseRef, {
        amount: updatedData.amount,
        category: updatedData.category,
        description: updatedData.description,
        date: updatedData.date?.toISOString()
      });
      
      await loadExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  };

  const deleteExpense = async (id: string) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'expenses', id));
      await loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  };

  const getYearlyTotal = (year: number) => {
    const yearExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getFullYear() === year;
    });
    return yearExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getCategoryAnalysis = (): CategoryTotal[] => {
    const categoryMap = new Map<string, number>();
    let total = 0;

    expenses.forEach(expense => {
      categoryMap.set(
        expense.category,
        (categoryMap.get(expense.category) || 0) + expense.amount
      );
      total += expense.amount;
    });

    const analysis: CategoryTotal[] = [];
    categoryMap.forEach((amount, category) => {
      analysis.push({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      });
    });

    return analysis.sort((a, b) => b.amount - a.amount);
  };

  const getMonthlyData = () => {
    const monthlyData: { [key: string]: number } = {};
    
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const key = format(date, 'MMM yyyy');
      monthlyData[key] = (monthlyData[key] || 0) + expense.amount;
    });

    return Object.entries(monthlyData).map(([month, total]) => ({
      month,
      total
    }));
  };

  return {
    expenses,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    getYearlyTotal,
    getCategoryAnalysis,
    getMonthlyData
  };
};