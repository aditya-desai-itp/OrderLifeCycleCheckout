import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { Button } from '../components/buttons';
import { Icons } from '../components/icons';
import { generateCartChecksum, generateIdempotencyKey } from '../utilities/checksum';
import { ORDER_STATES } from '../types/types';
import { Logger } from '../utilities/Logger';


export const PaymentView: React.FC = () => {
  const { state, dispatch, notify } = useAppStore();
  const [method, setMethod] = useState<'card' | 'upi'>('card');
  const [upiId, setUpiId] = useState('');
  const [card, setCard] = useState({ num: '', exp: '', cvv: '' });
  const [isValidating, setIsValidating] = useState(false);
  
  useEffect(() => {
    dispatch({ type: 'SET_SHARED_PAYMENT_ACTIVE', payload: true });
    
    // Safety cleanup: If user closes this tab, lift the lock for other tabs
    const handleUnload = () => {
      const savedStr = localStorage.getItem('checkout_app_state');
      if (savedStr) {
        const parsed = JSON.parse(savedStr);
        parsed.sharedPaymentActive = false;
        localStorage.setItem('checkout_app_state', JSON.stringify(parsed));
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      dispatch({ type: 'SET_SHARED_PAYMENT_ACTIVE', payload: false });
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [dispatch]);

  useEffect(() => {
    if (!state.checkoutToken && state.currentView === 'payment') {
      dispatch({ type: 'GENERATE_CHECKOUT_TOKEN' });
    }
  }, [state.checkoutToken, state.currentView, dispatch]);

  

  const totals = useMemo(() => {
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    return { total: (subtotal * 1.1).toFixed(2) };
  }, [state.cart]);

  const handlePay = async () => {

    if (state.isCheckoutLocked) return; 
    if (method === 'card' && (!card.num || !card.exp || !card.cvv)) { notify("Please fill card details", "error"); return; }
    if (method === 'upi' && !upiId) { notify("Please enter UPI ID", "error"); return; }

    dispatch({ type: 'LOCK_CHECKOUT', payload: true });
    setIsValidating(true);
    Logger.log('INFO', 'Payment initiated. Locking UI globally.');

     // --- ARTIFICIAL DELAY FOR TAB LOCK VERIFICATION ---
    
    
    if (!state.checkoutToken) {
      notify("Session token expired. Please refresh the page.", "error");
      dispatch({ type: 'LOCK_CHECKOUT', payload: false });
      setIsValidating(false);
      return;
    }
    // 1. Validation (Checksum Tamper Check)
    const currentHash = generateCartChecksum(state.cart);

    // 2. Level 2 Deep Validation: Cross-verify with source-of-truth Catalog
    // (This stops DevTools users who tampered price AND recalculated the hash manually)
    let isTampered = false;
    state.cart.forEach(item => {
      const realProduct = state.products.find(p => p.id === item.id);
      if (!realProduct || realProduct.price !== item.price) isTampered = true;
    });

    if (currentHash !== state.cartHash || isTampered) {
      Logger.log('SEC_AUDIT', 'Tampering detected at final submission boundary.');
      notify("Security Alert: Cart tampering detected! Price mismatch.", "error");
      
      // Auto-trigger conflict resolution internally
      const correctedCart = state.cart.map(item => {
         const real = state.products.find(p => p.id === item.id);
         return { ...item, price: real ? real.price : item.price };
      }).filter(item => item.price > 0);

      dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.CART_READY });
      dispatch({ type: 'SET_CART_CONFLICT', payload: { items: correctedCart } });
      
      setIsValidating(false);
      return; 
    }


    // 2. Orchestration
    const idKey = generateIdempotencyKey();
    dispatch({ type: 'SET_IDEMPOTENCY_KEY', payload: idKey });
    dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.CHECKOUT_VALIDATED });
    dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.ORDER_SUBMITTED });
    dispatch({ type: 'CONSUME_CHECKOUT_TOKEN' });
    simulateOrderSubmission(idKey);
    }
    
const simulateOrderSubmission = async (idempotencyKey:string) => {
    try {
      // API Delay Simulation
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': idempotencyKey, 'X-Checkout-Token': state.checkoutToken as string },
        body: JSON.stringify({ cart: state.cart, total: totals.total, customer: state.checkoutDetails })
      });

      if (!response.ok) throw new Error("API Rejected");

      const data = await response.json();
    // 3. API Simulation
    // setTimeout(() => {
    //   if (Math.random() < 0.1) {
    //     dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.ORDER_INCONSISTENT });
    //     notify("Gateway connection lost. Please try again.", "error");
    //   } else {
    //     dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.ORDER_SUCCESS });
    //     dispatch({ type: 'SET_VIEW', payload: 'status' });
    //     notify("Payment successful! Order placed.", "success");
    //   }
    //   dispatch({ type: 'LOCK_CHECKOUT', payload: false });
    // }, 2000);
    if (Math.random() < 0.1) {
        dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.ORDER_INCONSISTENT });
        notify("Gateway connection lost. Please try again.", "error");
      } else {

      dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.ORDER_SUCCESS });
      notify(`Order Placed Successfully! (Ref ID: #${data.id})`, "success");
      dispatch({ type: 'ORDER_COMPLETE_CLEAR' }); // Clears cart instantly but leaves user in success flow
      dispatch({ type: 'SET_VIEW', payload: 'status' });
    }
  }
 catch (error) {
      Logger.log('ERROR', 'API Submission failed.');
      dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.ORDER_FAILED });
      notify("Order failed. Please retry.", "error");
      dispatch({ type: 'GENERATE_CHECKOUT_TOKEN' }); 
      setIsValidating(false);
    } finally {
      dispatch({ type: 'LOCK_CHECKOUT', payload: false });
      setIsValidating(false);
    }
};

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'details' })} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"><Icons.ArrowLeft className="w-6 h-6"/></button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Secure Payment</h2>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
            <button onClick={() => setMethod('card')} className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${method === 'card' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Credit/Debit Card</button>
            <button onClick={() => setMethod('upi')} className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${method === 'upi' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>UPI</button>
          </div>

          <fieldset disabled={state.isCheckoutLocked}>
            {method === 'card' ? (
              <div className="space-y-4">
                <input type="text" placeholder="Card Number (Dummy)" value={card.num} onChange={e => setCard({...card, num: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                <div className="flex gap-4">
                  <input type="text" placeholder="MM/YY" value={card.exp} onChange={e => setCard({...card, exp: e.target.value})} className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                  <input type="password" placeholder="CVV" value={card.cvv} onChange={e => setCard({...card, cvv: e.target.value})} className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <input type="text" placeholder="Enter UPI ID (e.g., name@okbank)" value={upiId} onChange={e => setUpiId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                <p className="text-xs text-slate-500">A payment request will be sent to your UPI app.</p>
              </div>
            )}
          </fieldset>
        </div>

        <div className="w-full md:w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 h-fit">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Order Summary</h3>
          <div className="flex justify-between items-center mb-6 text-xl font-bold text-slate-900 dark:text-white pb-4 border-b border-slate-200 dark:border-slate-700">
            <span>Amount to Pay</span>
            <span>${totals.total}</span>
          </div>
          <Button onClick={handlePay} disabled={state.isCheckoutLocked} variant="accent" className="w-full py-4 text-lg shadow-lg shadow-orange-500/30">
            {isValidating ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Validating Security...
              </div>
            ) : state.isCheckoutLocked ? 'Processing...' : `Pay $${totals.total}`}
          </Button>
          {state.orderState === ORDER_STATES.ORDER_INCONSISTENT && (
            <p className="text-red-500 text-sm mt-4 text-center">Payment failed. Please try again.</p>
          )}
        </div>
      </div>
    </div>
  );
};
