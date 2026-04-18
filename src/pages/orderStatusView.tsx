import React, { useEffect } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { Button } from '../components/buttons';
import { Icons } from '../components/icons';
import { ORDER_STATES } from '../types/types';

export const OrderStatusView: React.FC = () => {
  const { state, dispatch, notify } = useAppStore();
  
  useEffect(() => {
    if (state.orderState === ORDER_STATES.ORDER_SUCCESS) {
      const t = setTimeout(() => { dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.ORDER_SHIPPED }); notify("Order has been shipped!", "info"); }, 3000);
      return () => clearTimeout(t);
    }
    if (state.orderState === ORDER_STATES.ORDER_SHIPPED) {
      const t = setTimeout(() => { dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.ORDER_IN_TRANSIT }); notify("Order is out for delivery.", "info"); }, 3000);
      return () => clearTimeout(t);
    }
    if (state.orderState === ORDER_STATES.ORDER_IN_TRANSIT) {
      const t = setTimeout(() => { dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.ORDER_DELIVERED }); notify("Order Delivered Successfully!", "success"); }, 3000);
      return () => clearTimeout(t);
    }
  }, [state.orderState, dispatch, notify]);

  const timelineSteps = [
    { key: ORDER_STATES.ORDER_SUCCESS, label: "Order Placed", icon: "" },
    { key: ORDER_STATES.ORDER_SHIPPED, label: "Shipped", icon: "" },
    { key: ORDER_STATES.ORDER_IN_TRANSIT, label: "Out for Delivery", icon: "" },
    { key: ORDER_STATES.ORDER_DELIVERED, label: "Delivered", icon: "" },
  ];

  const currentStepIndex = timelineSteps.findIndex(s => s.key === state.orderState);
  const activeIndex = currentStepIndex === -1 ? 0 : currentStepIndex;

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center animate-fade-in">
      <div className="bg-emerald-50 dark:bg-emerald-900/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-200 dark:border-emerald-800">
        <Icons.Check className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h2 className="text-4xl font-serif font-bold text-neutral-900 dark:text-white mb-3">Thank you, {state.checkoutDetails.name.split(' ')[0] || 'Customer'}</h2>
      <p className="text-neutral-500 dark:text-neutral-400 mb-16 text-lg">Your order is confirmed and being prepared for dispatch.</p>

      <div className="bg-white dark:bg-neutral-900 rounded-sm shadow-sm border border-neutral-200 dark:border-neutral-800 p-8 text-left max-w-md mx-auto relative border-t-4 border-t-emerald-600">
        <div className="absolute left-[3.25rem] top-12 bottom-12 w-0.5 bg-neutral-200 dark:bg-neutral-800 z-0"></div>
        <div className="absolute left-[3.25rem] top-12 w-0.5 bg-emerald-600 transition-all duration-1000 z-0" style={{ height: `${(activeIndex / (timelineSteps.length)) * 100}%` }}></div>
        
        {timelineSteps.map((step, idx) => {
          const isPassed = activeIndex >= idx;
          const isActive = activeIndex === idx;
          return (
            <div key={step.key} className="relative z-10 flex items-center gap-6 mb-10 last:mb-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition-colors duration-500 border-2 bg-white dark:bg-neutral-900 ${isPassed ? 'border-emerald-600 text-emerald-600 shadow-md' : 'border-neutral-200 dark:border-neutral-700 text-neutral-400'}`}>
                {isPassed ? <Icons.Check className="w-5 h-5" /> : idx + 1}
              </div>
              <div>
                <h4 className={`font-serif font-bold text-lg tracking-wide ${isPassed ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-neutral-600'}`}>{step.label} <span className="text-xl ml-1">{step.icon}</span></h4>
                {isActive && idx !== 3 && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-widest font-medium animate-pulse">In Progress...</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-16">
        <Button onClick={() => { dispatch({ type: 'CLEAR_CART' }); dispatch({ type: 'SET_VIEW', payload: 'catalog' }); }} variant="outline" className="mx-auto uppercase tracking-widest text-xs px-8">Continue Shopping</Button>
      </div>
    </div>
  );
};