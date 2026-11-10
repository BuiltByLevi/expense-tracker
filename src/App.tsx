import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EarningsProvider } from './context/EarningsContext';
import { ExpensesProvider } from './context/ExpensesContext';
import { IncomeProvider } from './context/IncomeContext';
import Dashboard from './components/Dashboard/Dashboard';
import Auth from './components/Auth/Auth';
import { Toaster } from 'react-hot-toast';
import { useSessionTimeout } from './hooks/useSessionTimeout';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  useSessionTimeout(); // ← activates auto-logout

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        Loading...
      </div>
    );
  }

  return user ? <Dashboard /> : <Auth />;
};

function App() {
  return (
    <AuthProvider>
      <ExpensesProvider>
        <IncomeProvider>
          <EarningsProvider>
            <AppContent />
            <Toaster position="top-right" />
          </EarningsProvider>
        </IncomeProvider>
      </ExpensesProvider>
    </AuthProvider>
  );
}

export default App;