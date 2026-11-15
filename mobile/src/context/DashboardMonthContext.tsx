import React, { createContext, useContext, useState } from 'react';

interface DashboardMonthContextType {
  selectedYear: number;
  selectedMonth: number;
  setSelectedYear: React.Dispatch<React.SetStateAction<number>>;
  setSelectedMonth: React.Dispatch<React.SetStateAction<number>>;
  goToMonth: (year: number, month: number) => void;
}

const DashboardMonthContext = createContext<DashboardMonthContextType | undefined>(undefined);

/**
 * The Dashboard tab and the Import screen are separate expo-router routes
 * (import is a modal pushed on top of the tabs), so a month selected on one
 * can't be passed to the other as a prop — this context is the shared state
 * that lets the Import screen jump the Dashboard to the statement's month
 * after a successful import, instead of leaving it on whatever month it was
 * already showing.
 */
export const DashboardMonthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const goToMonth = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  return (
    <DashboardMonthContext.Provider
      value={{ selectedYear, selectedMonth, setSelectedYear, setSelectedMonth, goToMonth }}
    >
      {children}
    </DashboardMonthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useDashboardMonth = () => {
  const context = useContext(DashboardMonthContext);
  if (!context) {
    throw new Error('useDashboardMonth must be used within a DashboardMonthProvider');
  }
  return context;
};
