import React, { useState, useEffect, useCallback } from 'react';
import { getActiveLoans, getCollateralByCid, repayLoan, liquidateLoan } from './lendingService';
import { Loan, LockedCollateral, AppError } from './types';

interface LoanDashboardProps {
  party: string;
  token: string;
}

interface LoanWithCollateral {
  loan: Loan;
  collateral: LockedCollateral | null;
  ltv?: number;
  healthStatus?: 'healthy' | 'warning' | 'danger';
  amountDue: number;
}

const styles: { [key: string]: React.CSSProperties } = {
  dashboard: { fontFamily: 'Arial, sans-serif', padding: '20px', backgroundColor: '#f4f7f9' },
  header: { fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '20px', borderBottom: '2px solid #ddd', paddingBottom: '10px' },
  loanGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' },
  loanCard: { border: '1px solid #ccc', borderRadius: '8px', padding: '15px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  loanCardHeader: { fontSize: '18px', fontWeight: 'bold', color: '#005ea5', marginBottom: '10px' },
  detailRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '14px' },
  detailLabel: { color: '#555', fontWeight: 'bold' },
  detailValue: { color: '#333' },
  actions: { marginTop: '15px', display: 'flex', gap: '10px' },
  button: { padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  repayButton: { backgroundColor: '#007f3b', color: 'white' },
  liquidateButton: { backgroundColor: '#d4351c', color: 'white' },
  disabledButton: { backgroundColor: '#ccc', cursor: 'not-allowed' },
  statusHealthy: { color: '#007f3b', fontWeight: 'bold' },
  statusWarning: { color: '#ffbf47', fontWeight: 'bold' },
  statusDanger: { color: '#d4351c', fontWeight: 'bold' },
  loader: { textAlign: 'center', fontSize: '18px', padding: '50px' },
  error: { color: '#d4351c', border: '1px solid #d4351c', padding: '15px', borderRadius: '4px', backgroundColor: '#fbeae8' },
  noLoans: { textAlign: 'center', color: '#555', padding: '50px', fontSize: '18px' },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '300px' },
  input: { width: 'calc(100% - 20px)', padding: '8px', margin: '10px 0', borderRadius: '4px', border: '1px solid #ccc' },
};

const LoanCard: React.FC<{ loanData: LoanWithCollateral; currentUser: string; token: string; onAction: () => void }> = ({ loanData, currentUser, token, onAction }) => {
  const { loan, collateral, ltv, healthStatus, amountDue } = loanData;
  const isBorrower = loan.payload.borrower === currentUser;
  const isLender = loan.payload.lender === currentUser;

  const [isRepayModalOpen, setRepayModalOpen] = useState(false);
  const [repayAmount, setRepayAmount] = useState('');

  const handleRepay = async () => {
    if (!repayAmount || isNaN(parseFloat(repayAmount))) {
      alert('Please enter a valid repayment amount.');
      return;
    }
    try {
      await repayLoan(loan.contractId, repayAmount, currentUser, token);
      alert('Repayment successful!');
      setRepayModalOpen(false);
      onAction(); // Refresh data
    } catch (err) {
      const appError = err as AppError;
      alert(`Repayment failed: ${appError.message}`);
    }
  };

  const handleLiquidate = async () => {
    if (window.confirm('Are you sure you want to liquidate this loan? This action cannot be undone.')) {
      try {
        await liquidateLoan(loan.contractId, currentUser, token);
        alert('Liquidation successful!');
        onAction(); // Refresh data
      } catch (err) {
        const appError = err as AppError;
        alert(`Liquidation failed: ${appError.message}`);
      }
    }
  };

  const getStatusStyle = () => {
    switch (healthStatus) {
      case 'healthy': return styles.statusHealthy;
      case 'warning': return styles.statusWarning;
      case 'danger': return styles.statusDanger;
      default: return {};
    }
  };
  
  const liquidationThreshold = collateral ? parseFloat(collateral.payload.liquidationThreshold) * 100 : 0;
  const canLiquidate = isLender && ltv && ltv > liquidationThreshold;

  return (
    <div style={styles.loanCard}>
      <div style={styles.loanCardHeader}>Loan ID: ...{loan.contractId.slice(-8)}</div>
      <div style={styles.detailRow}>
        <span style={styles.detailLabel}>Role</span>
        <span style={styles.detailValue}>{isBorrower ? 'Borrower' : 'Lender'}</span>
      </div>
      <div style={styles.detailRow}>
        <span style={styles.detailLabel}>Amount Due</span>
        <span style={styles.detailValue}>${amountDue.toFixed(2)}</span>
      </div>
       <div style={styles.detailRow}>
        <span style={styles.detailLabel}>Due Date</span>
        <span style={styles.detailValue}>{loan.payload.dueDate}</span>
      </div>
      <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '10px 0' }} />
      {collateral ? (
        <>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Collateral Asset</span>
            <span style={styles.detailValue}>{collateral.payload.quantity} {collateral.payload.asset}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Collateral Value</span>
            <span style={styles.detailValue}>${parseFloat(collateral.payload.currentValue).toFixed(2)}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>LTV / Threshold</span>
            <span style={{ ...styles.detailValue, ...getStatusStyle() }}>
              {ltv?.toFixed(2)}% / {liquidationThreshold.toFixed(2)}%
            </span>
          </div>
        </>
      ) : (
        <div>Loading collateral...</div>
      )}

      <div style={styles.actions}>
        {isBorrower && (
          <button style={styles.repayButton} onClick={() => setRepayModalOpen(true)}>Repay</button>
        )}
        {isLender && (
          <button 
            style={canLiquidate ? styles.liquidateButton : { ...styles.liquidateButton, ...styles.disabledButton }}
            onClick={handleLiquidate}
            disabled={!canLiquidate}
            title={canLiquidate ? 'Liquidate this loan' : 'Loan LTV is below liquidation threshold'}
          >
            Liquidate
          </button>
        )}
      </div>

      {isRepayModalOpen && (
        <div style={styles.modalBackdrop} onClick={() => setRepayModalOpen(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3>Repay Loan</h3>
            <p>Amount due: ${amountDue.toFixed(2)}</p>
            <input 
              type="number"
              placeholder="Enter amount to repay"
              value={repayAmount}
              onChange={e => setRepayAmount(e.target.value)}
              style={styles.input}
              max={amountDue.toString()}
              step="0.01"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button style={{...styles.button, backgroundColor: '#ddd'}} onClick={() => setRepayModalOpen(false)}>Cancel</button>
                <button style={{...styles.button, ...styles.repayButton}} onClick={handleRepay}>Submit Repayment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const LoanDashboard: React.FC<LoanDashboardProps> = ({ party, token }) => {
  const [loans, setLoans] = useState<LoanWithCollateral[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activeLoans = await getActiveLoans(party, token);
      const enrichedLoans = await Promise.all(
        activeLoans.map(async (loan) => {
          const collateral = await getCollateralByCid(loan.payload.collateralCid, token);
          
          const principal = parseFloat(loan.payload.principal);
          const paidAmount = parseFloat(loan.payload.paidAmount);
          const interestRate = parseFloat(loan.payload.interestRate);
          // NOTE: This is a simplified interest calculation. A production system would
          // use a more robust date-based calculation.
          const accruedInterest = (principal - paidAmount) * interestRate;
          const amountDue = (principal - paidAmount) + accruedInterest;

          let ltv: number | undefined;
          let healthStatus: 'healthy' | 'warning' | 'danger' | undefined;

          if (collateral) {
            const collateralValue = parseFloat(collateral.payload.currentValue);
            if (collateralValue > 0) {
              ltv = (amountDue / collateralValue) * 100;
              const liquidationThreshold = parseFloat(collateral.payload.liquidationThreshold);
              const warningThreshold = liquidationThreshold * 0.9;
              
              if (ltv >= liquidationThreshold * 100) {
                healthStatus = 'danger';
              } else if (ltv >= warningThreshold * 100) {
                healthStatus = 'warning';
              } else {
                healthStatus = 'healthy';
              }
            }
          }

          return { loan, collateral, ltv, healthStatus, amountDue };
        })
      );
      setLoans(enrichedLoans);
    } catch (err) {
      const appError = err as AppError;
      setError(appError.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [party, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return <div style={styles.loader}>Loading your loan dashboard...</div>;
  }

  if (error) {
    return <div style={styles.error}>Error: {error}</div>;
  }

  return (
    <div style={styles.dashboard}>
      <h1 style={styles.header}>Active Loans Dashboard</h1>
      {loans.length === 0 ? (
        <div style={styles.noLoans}>You have no active loans as a borrower or lender.</div>
      ) : (
        <div style={styles.loanGrid}>
          {loans.map(loanData => (
            <LoanCard
              key={loanData.loan.contractId}
              loanData={loanData}
              currentUser={party}
              token={token}
              onAction={fetchData} // Pass the refresh function
            />
          ))}
        </div>
      )}
    </div>
  );
};