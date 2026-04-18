import { useAppStore } from "../hooks/useAppStore";

export const CheckoutProgress: React.FC = () => {
  const { state } = useAppStore();
  if (state.currentView === 'catalog') return null;

  const steps = [
    { id: 'cart', label: 'Cart', isActive: ['cart', 'details', 'payment', 'status'].includes(state.currentView) },
    { id: 'details', label: 'Details', isActive: ['details', 'payment', 'status'].includes(state.currentView) },
    { id: 'payment', label: 'Payment', isActive: ['payment', 'status'].includes(state.currentView) },
    { id: 'status', label: 'Order Placed', isActive: ['status'].includes(state.currentView) },
  ];

  return (
    <div className="bg-white dark:bg-neutral-950 shadow-sm border-b border-neutral-200 dark:border-neutral-900 py-4 mb-6">
      <div className="max-w-4xl mx-auto px-4 flex justify-between items-center relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-neutral-200 dark:bg-neutral-800 -z-10 transform -translate-y-1/2"></div>
        {steps.map((step, idx) => (
          <div key={step.id} className="flex flex-col items-center bg-white dark:bg-neutral-950 px-2 relative z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step.isActive ? 'bg-amber-600 text-white ring-4 ring-amber-50 dark:ring-amber-900/30' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
            }`}>
              {idx + 1}
            </div>
            <span className={`text-xs mt-2 font-medium tracking-wider uppercase hidden sm:block ${step.isActive ? 'text-amber-600 dark:text-amber-500' : 'text-neutral-400 dark:text-neutral-600'}`}>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
