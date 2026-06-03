import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(email, password);
        toast.success('Logged in successfully!');
      } else {
        await signup(email, password);
        toast.success('Account created successfully!');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>
          {isLogin ? 'Login' : 'Sign Up'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '1rem'
              }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '1rem'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '1rem',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
        <button
          onClick={() => setIsLogin(!isLogin)}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'transparent',
            color: '#667eea',
            border: '1px solid #667eea',
            borderRadius: '5px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
};

export default Auth;