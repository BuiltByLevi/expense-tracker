import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#0f172a', color: 'white', textAlign: 'center' }}>
          <div className="glass-card" style={{ padding: '40px', maxWidth: '500px', background: 'rgba(255,255,255,0.05)' }}>
            <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#ef4444' }}>Oops, something went wrong</h1>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px' }}>
              The app encountered an unexpected error. Your data is safe in the database.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn btn-primary" 
              style={{ padding: '12px 24px', width: '100%' }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;