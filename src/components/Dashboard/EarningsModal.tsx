import React, { useState } from 'react';
import toast from 'react-hot-toast';

interface EarningsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEarnings: number;
  onSave: (amount: number) => Promise<void>;
}

const EarningsModal: React.FC<EarningsModalProps> = ({ isOpen, onClose, currentEarnings, onSave }) => {
  const [amount, setAmount] = useState(currentEarnings.toString());
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newAmount = parseFloat(amount);
    
    if (isNaN(newAmount) || newAmount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      await onSave(newAmount);
      onClose();
    } catch (error: any) {
      console.error('Save error:', error);
      // Error toast is already shown in context
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        padding: '32px',
        borderRadius: '20px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#1a1a2e' }}>
          Set Monthly Earnings
        </h2>
        <p style={{ color: '#666', marginBottom: '24px', fontSize: '14px' }}>
          Enter your monthly income to track savings
        </p>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
              Monthly Earnings ($)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="100"
              required
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                fontSize: '16px',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                background: '#f0f0f0',
                color: '#666',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e0e0e0'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f0f0f0'}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: '12px',
                background: saving ? '#95a5a6' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
            >
              {saving ? 'Saving...' : 'Save Earnings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EarningsModal;