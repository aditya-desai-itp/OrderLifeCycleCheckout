import React, { useMemo } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { Button } from '../components/buttons';
import { Icons } from '../components/icons';
import { VirtualCartList } from '../components/virtCart';

export const CartView: React.FC = () => {
  const { state, dispatch, notify } = useAppStore();
  const totals = useMemo(() => {
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    return { subtotal, tax: subtotal * 0.1, total: subtotal * 1.1 };
  }, [state.cart]);
  
  const isActionDisabled = state.isCheckoutLocked || state.sharedPaymentActive;

  if (state.cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center animate-fade-in">
        <Icons.Cart className="w-20 h-20 mx-auto mb-6 text-neutral-300 dark:text-neutral-700" />
        <h2 className="text-3xl font-serif font-bold text-neutral-900 dark:text-white mb-4">Your Bag is Empty</h2>
        <p className="text-neutral-500 mb-8">Looks like you haven't made your choice yet.</p>
        <Button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'catalog' })}>Discover Things</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'catalog' })} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"><Icons.ArrowLeft className="w-6 h-6"/></button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Review Cart</h2>
      </div>

      <div className="mb-8">
        <VirtualCartList items={state.cart} rowHeight={160} containerHeight={450} />
      </div>
      <div className="bg-white dark:bg-neutral-900 rounded-sm shadow-sm border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="w-full sm:w-1/2 space-y-3">
          <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400"><span>Bag Total</span><span>${totals.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm text-neutral-600 dark:text-slate-400"><span>Estimated Tax</span><span>${totals.tax.toFixed(2)}</span></div>
          <div className="flex justify-between text-2xl font-serif font-bold text-neutral-900 dark:text-white pt-4 border-t border-neutral-200 dark:border-neutral-700"><span>Total</span><span>${totals.total.toFixed(2)}</span></div>
        </div>
        <div className="w-full sm:w-auto flex flex-col gap-4 w-full sm:min-w-[250px]">
           <Button disabled={isActionDisabled} onClick={() => dispatch({ type: 'SET_VIEW', payload: 'details' })} className="w-full py-3.5 text-base tracking-widest uppercase">Proceed</Button>
           <button disabled={isActionDisabled} onClick={() => { dispatch({ type: 'SIMULATE_TAMPERING' }); notify("Price tampered. Refresh to see Deep Security Validation catch it.", "warning") }} className="text-xs text-neutral-400 hover:text-red-600 underline text-center disabled:opacity-50 transition-colors">Developer: Simulate Tampering</button>
        </div>
      </div>
    </div>
  );
};