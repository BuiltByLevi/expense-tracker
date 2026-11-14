import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EarningsProvider } from './context/EarningsContext';
import { ExpensesProvider } from './context/ExpensesContext';
import { IncomeProvider } from './context/IncomeContext';
import { BudgetsProvider } from './context/BudgetsContext';
// Signed-in and signed-out screens load separately: the sign-in page doesn't
// pull in the dashboard (charts, statement import) and vice versa.
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const Auth = lazy(() => import('./components/Auth/Auth'));
import { Toaster } from 'react-hot-toast';
import FinanceBackdrop from './components/common/FinanceBackdrop';
import { useSessionTimeout } from './hooks/useSessionTimeout';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  useSessionTimeout(); // ← activates auto-logout

  const splash = (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      Loading...
    </div>
  );

  if (loading) return splash;

  return <Suspense fallback={splash}>{user ? <Dashboard /> : <Auth />}</Suspense>;
};

function App() {
  return (
    <AuthProvider>
      <ExpensesProvider>
        <IncomeProvider>
          <EarningsProvider>
            <BudgetsProvider>
              <FinanceBackdrop />
              <div className="app-layer">
                <AppContent />
              </div>
              <Toaster position="top-right" />
            </BudgetsProvider>
          </EarningsProvider>
        </IncomeProvider>
      </ExpensesProvider>
    </AuthProvider>
  );
}

export default App;