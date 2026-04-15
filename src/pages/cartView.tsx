import React, { useMemo } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { Button } from '../components/buttons';
import { Icons } from '../components/icons';

export const CartView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const totals = useMemo(() => {
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    return { subtotal, tax: subtotal * 0.1, total: subtotal * 1.1 };
  }, [state.cart]);

  if (state.cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Icons.Cart className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Your cart is empty</h2>
        <Button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'catalog' })}>Continue Shopping</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'catalog' })} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"><Icons.ArrowLeft className="w-6 h-6"/></button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Review Cart</h2>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8 space-y-6">
        {state.cart.map(item => (
          <div key={item.id} className="flex flex-col sm:flex-row gap-4 items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <img src={item.image} alt="" className="w-20 h-20 object-contain mix-blend-multiply dark:mix-blend-normal bg-white dark:bg-slate-800 rounded-lg p-2" />
            <div className="flex-1 text-center sm:text-left">
              <h4 className="text-base font-semibold text-slate-900 dark:text-slate-50">{item.title}</h4>
              <p className="text-sm text-slate-500">${item.price.toFixed(2)} each</p>
            </div>
            <div className="flex flex-col items-center sm:items-end gap-3">
              <span className="text-lg font-bold text-slate-900 dark:text-white">${(item.price * item.qty).toFixed(2)}</span>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-1">
                <button onClick={() => dispatch({ type: 'UPDATE_CART_QTY', payload: { id: item.id, qty: item.qty - 1 } })} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200">-</button>
                <span className="text-sm font-medium w-6 text-center text-slate-900 dark:text-white">{item.qty}</span>
                <button onClick={() => dispatch({ type: 'UPDATE_CART_QTY', payload: { id: item.id, qty: item.qty + 1 } })} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200">+</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="w-full sm:w-1/3 space-y-2">
          <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Subtotal</span><span>${totals.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Tax (10%)</span><span>${totals.tax.toFixed(2)}</span></div>
          <div className="flex justify-between text-xl font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700"><span>Total</span><span>${totals.total.toFixed(2)}</span></div>
        </div>
        <div className="w-full sm:w-auto flex flex-col gap-3">
           <button onClick={() => dispatch({ type: 'SIMULATE_TAMPERING' })} className="text-xs text-slate-400 hover:text-red-500 underline text-right">Simulate Tampering</button>
           <Button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'details' })} variant="accent" className="w-full sm:w-64 py-3 text-lg shadow-lg shadow-orange-500/30">Proceed to Details</Button>
        </div>
      </div>
    </div>
  );
};