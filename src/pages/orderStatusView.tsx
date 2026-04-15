import React, { useEffect } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { Button } from '../components/buttons';
import { Icons } from '../components/icons';
import { ORDER_STATES } from '../types/types';

export const OrderStatusView: React.FC = () => {
  const { state, dispatch, notify } = useAppStore();

  // Simulated Transit Lifecycle (Requirement Implementation)
  useEffect(() => {
    let timer: number;
    if (state.orderState === ORDER_STATES.ORDER_SUCCESS) 
    {
        timer = setTimeout(() => {
        dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.ORDER_SHIPPED });
        notify("Order has been shipped!", "info");
        }, 2000);
        } else if (state.orderState === ORDER_STATES.ORDER_SHIPPED) {
            timer = setTimeout(() => {
            dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.ORDER_IN_TRANSIT });
            notify("Order is out for delivery.", "info");
            }, 4000);
        } else if (state.orderState === ORDER_STATES.ORDER_IN_TRANSIT) {
            timer = setTimeout(() => {
            dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.ORDER_DELIVERED });
            notify("Order Delivered Successfully!", "success");
            }, 6000);
            return () => { clearTimeout(timer); };
    }
    }, [state.orderState, dispatch, notify]);

  const timelineSteps = [
    { key: ORDER_STATES.ORDER_SUCCESS, label: "Order Placed", icon: "📦" },
    { key: ORDER_STATES.ORDER_SHIPPED, label: "Shipped", icon: "🚚" },
    { key: ORDER_STATES.ORDER_IN_TRANSIT, label: "Out for Delivery", icon: "📍" },
    { key: ORDER_STATES.ORDER_DELIVERED, label: "Delivered", icon: "🏠" },
  ];

  const currentStepIndex = timelineSteps.findIndex(s => s.key === state.orderState);
  const activeIndex = currentStepIndex === -1 ? 0 : currentStepIndex;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <div className="bg-green-100 dark:bg-green-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-500">
        <Icons.Check className="w-10 h-10 text-green-600 dark:text-green-400" />
      </div>
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Thank you, {state.checkoutDetails.name.split(' ')[0]}!</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-12">Your order has been confirmed and is now being processed.</p>

      {/* Vertical Timeline for Tracking */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-left max-w-md mx-auto relative">
        <div className="absolute left-12 top-10 bottom-10 w-1 bg-slate-200 dark:bg-slate-700 z-0"></div>
        <div className="absolute left-12 top-10 w-1 bg-blue-600 transition-all duration-1000 z-0" style={{ height: `${(activeIndex / (timelineSteps.length)) * 98}%` }}></div>
        
        {timelineSteps.map((step, idx) => {
          const isPassed = activeIndex >= idx;
          const isActive = activeIndex === idx;
          return (
            <div key={step.key} className="relative z-10 flex items-center gap-6 mb-8 last:mb-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors duration-500 ${isPassed ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                {isPassed ? <Icons.Check className="w-4 h-4" /> : idx + 1}
              </div>
              <div>
                <h4 className={`font-bold text-lg ${isPassed ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}>{step.label} {step.icon}</h4>
                {isActive && step.key!=="ORDER_DELIVERED" && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 animate-pulse">In Progress...</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12">
        <Button onClick={() => dispatch({ type: 'CLEAR_CART' })} variant="outline" className="mx-auto">Continue Shopping</Button>
      </div>
    </div>
  );
};