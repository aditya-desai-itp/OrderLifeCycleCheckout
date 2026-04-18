import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { Button } from '../components/buttons';
import { Icons } from '../components/icons';
import type { CheckoutDetails } from '../types/types';
import { FloatingInput } from '../components/FloatingInput';

export const DetailsView: React.FC = () => {
  const { state, dispatch, notify } = useAppStore();
  const [d, setD] = useState<CheckoutDetails>(state.checkoutDetails);
  const isActionDisabled = state.isCheckoutLocked || state.sharedPaymentActive;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.name || !d.email || !d.address || !d.city || !d.zip) { 
      notify("Please fill all required fields.", "error"); 
      return; 
    }
    dispatch({ type: 'UPDATE_CHECKOUT_DETAILS', payload: d });
    dispatch({ type: 'SET_VIEW', payload: 'payment' });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'cart' })} aria-label="Back to Cart" className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full text-neutral-500 transition-colors"><Icons.ArrowLeft className="w-6 h-6"/></button>
        <h2 className="text-3xl font-serif font-bold text-neutral-900 dark:text-white">Shipping Details</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 rounded-sm shadow-sm border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 border-t-4 border-t-rose-900">
        <fieldset disabled={isActionDisabled} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FloatingInput label="Full Name" id="fname" required value={d.name} onChange={e => setD({ ...d, name: e.target.value })} />
            <FloatingInput label="Email Address" id="femail" type="email" required value={d.email} onChange={e => setD({ ...d, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-6">
            <FloatingInput label="Street Address" id="faddress" required value={d.address} onChange={e => setD({ ...d, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FloatingInput label="City" id="fcity" required value={d.city} onChange={e => setD({ ...d, city: e.target.value })} />
            <FloatingInput label="ZIP / Postal Code" id="fzip" required value={d.zip} onChange={e => setD({ ...d, zip: e.target.value })} />
          </div>
        </fieldset> 
        <div className="pt-8 mt-8 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
          <Button disabled={isActionDisabled} type="submit" className="w-full sm:w-auto py-3.5 px-10 text-sm tracking-widest uppercase">Continue to Payment</Button>
        </div>
      </form>
    </div>
  );
};