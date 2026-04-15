import { useAppStore } from '../hooks/useAppStore';
import { ORDER_STATES, type OrderState } from '../types/types';
import { Icons } from './icons';

export const OrderTimeline: React.FC = () => {
  const { state } = useAppStore();
  
  const steps : {key: OrderState, label: string}[] = [
    { key: ORDER_STATES.CART_READY, label: "Cart" },
    { key: ORDER_STATES.CHECKOUT_VALIDATED, label: "Validated" },
    { key: ORDER_STATES.ORDER_SUBMITTED, label: "Processing" },
    { key: ORDER_STATES.ORDER_SUCCESS, label: "Complete" },
  ];

  const currentIndex = steps.findIndex(s => s.key === state.orderState);
  const isFailed = state.orderState === ORDER_STATES.ORDER_FAILED || state.orderState === ORDER_STATES.ORDER_INCONSISTENT;

  return (
    <div className="mb-8 overflow-hidden">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 z-0 rounded"></div>
        {steps.map((step, idx) => {
          const isActive = state.orderState === step.key;
          const isPassed = currentIndex >= idx && !isFailed;
          const isErrorState = isFailed && idx === 2; // Show error around processing stage
          
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors
                ${isPassed ? 'bg-green-500 text-white' : 
                  isErrorState ? 'bg-red-500 text-white' : 
                  isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900' : 
                  'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'}`}>
                {isPassed ? '✓' : isErrorState ? '!' : idx + 1}
              </div>
              <span className={`text-xs mt-2 font-medium hidden sm:block
                ${isActive || isPassed ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      {isFailed && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800 flex items-center gap-2">
          <Icons.Alert /> {state.orderState === ORDER_STATES.ORDER_INCONSISTENT ? "State Inconsistency Detected. Please Retry." : "Order Failed. Please try again."}
        </div>
      )}
    </div>
  );
};