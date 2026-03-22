// ./src/components/view-tournament/tournament-details-banner/payment/Payment.js
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from './payment.module.css';

const PaymentModal = ({ isOpen, onClose, onBack, onComplete, tournament, selectedTeam, teamMembers, registrationData }) => {
  const { data: session } = useSession();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    if (isOpen && session?.user?.sessionToken) {
      fetchWalletBalance();
    }
  }, [isOpen, session?.user?.sessionToken]);

  const fetchWalletBalance = async () => {
    setBalanceLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/balance/`, {
        headers: { Authorization: `Bearer ${session.user.sessionToken}` },
      });
      const data = await res.json();
      if (data.status === 'success') {
        setWalletBalance(data.data.balance);
      }
    } catch (err) {
      console.error('Failed to fetch wallet balance:', err);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method);
    setPaymentError(null);
  };

  const handlePayNow = async () => {
    if (!selectedPaymentMethod) return;

    setIsProcessing(true);
    setPaymentError(null);

    try {
      if (selectedPaymentMethod === 'wallet') {
        const requiredAmount = getRequiredAmount();

        if (walletBalance === null) {
          setPaymentError('Could not load wallet balance. Please refresh and try again.');
          setIsProcessing(false);
          return;
        }

        if (walletBalance < requiredAmount) {
          setPaymentError(`Insufficient balance. You have ${walletBalance} vent coins but need ${requiredAmount}.`);
          setIsProcessing(false);
          return;
        }

        // Balance is sufficient — pass payment intent to parent; deduction handled in tournament registration
        onComplete({ paymentMethod: 'wallet', amount: requiredAmount });

      } else if (selectedPaymentMethod === 'paystack') {
        const requiredAmount = getRequiredAmount();
        // 1 vent coin = N1,000; send amount in kobo (Paystack standard)
        const amountInKobo = requiredAmount * 1000 * 100;
        const callbackUrl = `${window.location.origin}/wallet-topup-callback?redirect_to=${encodeURIComponent(window.location.href)}`;

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/topup/initiate/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.user.sessionToken}`,
          },
          body: JSON.stringify({ amount: amountInKobo, callback_url: callbackUrl }),
        });
        const data = await res.json();

        if (data.status === 'success' && data.data?.authorization_url) {
          window.location.href = data.data.authorization_url;
        } else {
          setPaymentError(data.message || 'Failed to initiate payment. Please try again.');
          setIsProcessing(false);
        }
      }
    } catch (error) {
      console.error('Payment failed:', error);
      setPaymentError('An unexpected error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  const getRequiredAmount = () => {
    return tournament?.entry_fee_price === 0 || tournament?.entry_fee_price === "0.00"
      ? 40
      : tournament?.entry_fee_price;
  };

  const getEntryFeeDisplay = () => {
    if (tournament?.entry_fee_price === 0 || tournament?.entry_fee_price === "0.00") {
      return {
        amount: "40 vent coins",
        conversion: "N1,000 = 1 vent coin"
      };
    }
    return {
      amount: `${tournament?.entry_fee_price}`,
      conversion: null
    };
  };

  const getWalletStatus = () => {
    const requiredAmount = getRequiredAmount();
    return {
      balance: walletBalance,
      hasSufficientFunds: walletBalance !== null && walletBalance >= requiredAmount,
      required: requiredAmount,
      isConnected: walletBalance !== null,
    };
  };

  if (!isOpen) return null;

  const entryFee = getEntryFeeDisplay();
  const walletStatus = getWalletStatus();

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <button className={styles.backButton} onClick={handleBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5m7-7l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2 className={styles.modalTitle}>Select Payment Method</h2>
          </div>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.subtitle}>Choose your preferred payment method</p>

          {/* Entry Fee Section */}
          <div className={styles.entryFeeSection}>
            <div className={styles.entryFeeHeader}>
              <svg className={styles.entryFeeIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="6" width="20" height="12" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span className={styles.entryFeeLabel}>Entry Fee</span>
            </div>
            <div className={styles.entryFeeDetails}>
              <span className={styles.entryFeeAmount}>
                {tournament?.entry_fee_price === 0 || tournament?.entry_fee_price === "0.00" ? (
                  <>
                    <svg className={styles.coinIcon} width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="2" fill="#f59e0b"/>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="white" strokeWidth="2"/>
                      <point cx="12" cy="17" stroke="white" strokeWidth="2"/>
                    </svg>
                    40 vent coins
                  </>
                ) : (
                  entryFee.amount
                )}
              </span>
              {entryFee.conversion && (
                <span className={styles.entryFeeConversion}>{entryFee.conversion}</span>
              )}
            </div>
          </div>

          {/* Payment Methods */}
          <div className={styles.paymentMethodsSection}>
            {/* Wallet Payment */}
            <div
              className={`${styles.paymentMethod} ${selectedPaymentMethod === 'wallet' ? styles.selected : ''} ${!walletStatus.hasSufficientFunds ? styles.insufficient : ''}`}
              onClick={() => handlePaymentMethodSelect('wallet')}
            >
              <div className={styles.paymentMethodContent}>
                <div className={styles.paymentMethodLeft}>
                  <span className={styles.paymentMethodTitle}>Pay With Wallet</span>
                  <div className={styles.walletBalance}>
                    <svg className={styles.coinIcon} width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="2" fill="#f59e0b"/>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="white" strokeWidth="2"/>
                      <point cx="12" cy="17" stroke="white" strokeWidth="2"/>
                    </svg>
                    {balanceLoading ? 'Loading...' : walletStatus.isConnected ? `${walletStatus.balance} vent coins` : 'Balance unavailable'}
                  </div>
                  {!balanceLoading && !walletStatus.isConnected && (
                    <div className={styles.insufficientFunds}>
                      Could not load balance — please try again
                    </div>
                  )}
                  {walletStatus.isConnected && !walletStatus.hasSufficientFunds && (
                    <div className={styles.insufficientFunds}>
                      Insufficient funds (need {walletStatus.required})
                    </div>
                  )}
                </div>
                <div className={styles.radioButton}>
                  <div className={`${styles.radioInner} ${selectedPaymentMethod === 'wallet' ? styles.radioSelected : ''}`}></div>
                </div>
              </div>
            </div>

            {/* Paystack Payment */}
            <div
              className={`${styles.paymentMethod} ${selectedPaymentMethod === 'paystack' ? styles.selected : ''}`}
              onClick={() => handlePaymentMethodSelect('paystack')}
            >
              <div className={styles.paymentMethodContent}>
                <div className={styles.paymentMethodLeft}>
                  <div className={styles.paystackHeader}>
                    <div className={styles.paystackIcon}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                        <line x1="7" y1="8" x2="17" y2="8" stroke="currentColor" strokeWidth="2"/>
                        <line x1="7" y1="12" x2="13" y2="12" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    <span className={styles.paymentMethodTitle}>Pay via Paystack</span>
                  </div>
                  <p className={styles.paystackDescription}>Pay with card, bank transfer etc. 100% safe and secure.</p>
                  <div className={styles.cardLogos}>
                    <div className={styles.mastercardLogo}>
                      <div className={styles.mastercardCircle} style={{backgroundColor: '#eb001b'}}></div>
                      <div className={styles.mastercardCircle} style={{backgroundColor: '#f79e1b', marginLeft: '-8px'}}></div>
                    </div>
                    <span className={styles.visaLogo}>VISA</span>
                  </div>
                </div>
                <div className={styles.radioButton}>
                  <div className={`${styles.radioInner} ${selectedPaymentMethod === 'paystack' ? styles.radioSelected : ''}`}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Inline error — replaces alert() */}
          {paymentError && (
            <div className={styles.paymentError}>
              {paymentError}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={handleClose}>
            Cancel
          </button>
          <button
            className={`${styles.payButton} ${!selectedPaymentMethod || isProcessing ? styles.disabled : ''}`}
            onClick={handlePayNow}
            disabled={!selectedPaymentMethod || isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Pay now →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
