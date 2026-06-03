import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EarningsProvider } from './context/EarningsContext';
import Dashboard from './components/Dashboard/Dashboard';
import Auth from './components/Auth/Auth';
import { Toaster } from 'react-hot-toast';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        Loading...
      </div>
    );
  }

  return user ? <Dashboard /> : <Auth />;
};

function App() {
  return (
    <AuthProvider>
      <EarningsProvider>
        <AppContent />
        <Toaster position="top-right" />
      </EarningsProvider>
    </AuthProvider>
  );
}

export default App;