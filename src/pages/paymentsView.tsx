import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { Button } from '../components/buttons';
import { Icons } from '../components/icons';
import { generateCartChecksum, generateIdempotencyKey } from '../utilities/securityGenerate';
import { ORDER_STATES, type Product } from '../types/types';
import { Logger } from '../utilities/Logger';
import { FloatingInput } from '../components/FloatingInput';
import { deterministicRandom } from '../utilities/numberGenerate';

export const PaymentView: React.FC = () => {
  const { state, dispatch, notify } = useAppStore();
  const [method, setMethod] = useState<'card' | 'upi'>('card');
  const [upiId, setUpiId] = useState('');
  const [card, setCard] = useState({ num: '', exp: '', cvv: '' });
  const [isValidating, setIsValidating] = useState(false);
  
  useEffect(() => {
    dispatch({ type: 'SET_SHARED_PAYMENT_ACTIVE', payload: true });
    
    // If user closes this tab, lift the lock for other tabs
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

     // Stale Price Validation
    
    let livePrices: Product[] = state.products; 
    try {
      const res = await fetch('https://fakestoreapi.com/products');
      const data = await res.json() as Product[];
      let massiveDataset: Product[] = [];
      for (let i = 0; i < 25; i++) 
        massiveDataset = [...massiveDataset, 
                    ...data.map(p => ({ ...p, 
                      id: `${p.id}_${i}`, 
                      title: `${p.title} (Batch ${i+1})`,
                    price: parseFloat((p.price + deterministicRandom(`${p.title} (Batch ${i+1})`)).toFixed(2)) }))];
      livePrices = massiveDataset;
      Logger.log('INFO', 'Fetched LIVE catalog prices for checkout verification.');
    } catch (err) {
      Logger.log('WARN', 'Failed to fetch live catalog. Falling back to in-memory state.');
    }
    
    if (!state.checkoutToken) {
      notify("Session token expired. Please refresh the page.", "error");
      dispatch({ type: 'LOCK_CHECKOUT', payload: false });
      setIsValidating(false);
      return;
    }
    // Level 1: Checksum Tamper Check
    const currentHash = generateCartChecksum(state.cart);

    // Level 2 Deep Validation: Cross-verify with source-of-truth Catalog
    let isTamperedOrStale = false;
    state.cart.forEach(item => {
      const realProduct = livePrices.find(p => p.id === item.id);
      if (!realProduct || realProduct.price !== item.price) isTamperedOrStale = true;
    });

    if (currentHash !== state.cartHash || isTamperedOrStale) {
      Logger.log('SEC_AUDIT', 'Tampering detected at final submission boundary.');
      notify("Security Alert: Cart tampering detected! Price mismatch.", "error");
      
      // Auto-trigger conflict resolution internally
      const correctedCart = state.cart.map(item => {
         const real = livePrices.find(p => p.id === item.id);
         return { ...item, price: real ? real.price : item.price };
      }).filter(item => item.price > 0);

      dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.CART_READY });
      dispatch({ type: 'SET_CART_CONFLICT', payload: { items: correctedCart } });
      
      setIsValidating(false);
      return; 
    }

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
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'details' })} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"><Icons.ArrowLeft className="w-6 h-6"/></button>
        <h2 className="text-3xl font-serif font-bold text-neutral-900 dark:text-white">Secure Payment</h2>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 bg-white dark:bg-neutral-900 rounded-sm shadow-sm border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 border-t-4 border-t-rose-900">
          <div className="flex border-b border-neutral-200 dark:border-neutral-800 mb-8">
            <button onClick={() => setMethod('card')} className={`flex-1 py-4 text-center text-sm tracking-widest uppercase font-medium border-b-2 transition-colors ${method === 'card' ? 'border-neutral-900 text-neutral-900 dark:border-amber-500 dark:text-amber-500' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>Credit Card</button>
            <button onClick={() => setMethod('upi')} className={`flex-1 py-4 text-center text-sm tracking-widest uppercase font-medium border-b-2 transition-colors ${method === 'upi' ? 'border-neutral-900 text-neutral-900 dark:border-amber-500 dark:text-amber-500' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>UPI</button>
          </div>

          <fieldset disabled={state.isCheckoutLocked} className="space-y-6">
            {method === 'card' ? (
              <>
                <FloatingInput label="Card Number (Dummy)" id="pcard" value={card.num} onChange={e => setCard({...card, num: e.target.value})} />
                <div className="flex gap-6">
                  <FloatingInput label="MM/YY" id="pexp" value={card.exp} onChange={e => setCard({...card, exp: e.target.value})} />
                  <FloatingInput label="CVV" id="pcvv" type="password" value={card.cvv} onChange={e => setCard({...card, cvv: e.target.value})} />
                </div>
              </>
            ) : (
              <>
                <FloatingInput label="Enter UPI ID (e.g., user@bank)" id="pupi" value={upiId} onChange={e => setUpiId(e.target.value)} />
                <p className="text-xs text-neutral-500 italic">A payment request will be sent to your UPI application.</p>
              </>
            )}
          </fieldset>
        </div>

        <div className="w-full md:w-[350px] bg-neutral-50 dark:bg-neutral-900 rounded-sm shadow-sm border border-neutral-200 dark:border-neutral-800 p-6 h-fit">
          <h3 className="font-serif font-bold text-xl text-neutral-900 dark:text-white mb-6">Summary</h3>
          <div className="space-y-3 mb-6 pb-6 border-b border-neutral-200 dark:border-neutral-800 text-sm text-neutral-600 dark:text-neutral-400">
             <div className="flex justify-between"><span>Items</span><span>{state.cart.reduce((s,i)=>s+i.qty,0)}</span></div>
             <div className="flex justify-between"><span>Shipping</span><span className="text-emerald-600">Free</span></div>
          </div>
          <div className="flex justify-between items-end mb-8 text-2xl font-serif font-bold text-neutral-900 dark:text-amber-500">
            <span className="text-sm text-neutral-500 uppercase tracking-widest font-sans">Total</span>
            <span>${totals.total}</span>
          </div>
          <Button onClick={handlePay} disabled={state.isCheckoutLocked} className="w-full py-4 text-sm tracking-widest uppercase shadow-lg">
            {isValidating ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Validating...
              </div>
            ) : state.isCheckoutLocked ? 'Processing...' : `Pay $${totals.total}`}
          </Button>
          {state.orderState === ORDER_STATES.ORDER_INCONSISTENT && (
            <p className="text-rose-600 text-sm mt-4 text-center font-medium bg-rose-50 dark:bg-rose-900/20 p-2 rounded">Payment failed. Please retry.</p>
          )}
        </div>
      </div>
    </div>
  );
};
