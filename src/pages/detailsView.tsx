import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { Button } from '../components/buttons';
import { Icons } from '../components/icons';
import type { CheckoutDetails } from '../types/types';

export const DetailsView: React.FC = () => {
  const { state, dispatch, notify } = useAppStore();
  
  // FIX: Isolated Local State for Form to prevent Cross-Tab Flickering!
  const [d, setD] = useState<CheckoutDetails>(state.checkoutDetails);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.name || !d.email || !d.address || !d.city || !d.zip) { notify("Please fill all required fields.", "error"); return; }
    
    // Dispatch to global store ONLY on submit to prevent rapid re-renders
    dispatch({ type: 'UPDATE_CHECKOUT_DETAILS', payload: d });
    dispatch({ type: 'SET_VIEW', payload: 'payment' });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'cart' })} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"><Icons.ArrowLeft className="w-6 h-6"/></button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Shipping Details</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <fieldset disabled={state.isCheckoutLocked}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
              <input type="text" required value={d.name} onChange={e => setD({ ...d, name: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
              <input type="email" required value={d.email} onChange={e => setD({ ...d, email: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="space-y-1 mt-4">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Street Address</label>
            <input type="text" required value={d.address} onChange={e => setD({ ...d, address: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">City</label>
              <input type="text" required value={d.city} onChange={e => setD({ ...d, city: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">ZIP / Postal Code</label>
              <input type="text" required value={d.zip} onChange={e => setD({ ...d, zip: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500" />
            </div>
          </div>
        </fieldset>
        
        <div className="pt-4 mt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <Button disabled={state.isCheckoutLocked} type="submit" variant="primary" className="w-full sm:w-auto py-3 px-8">Proceed to Payment</Button>
        </div>
      </form>
    </div>
  );
};