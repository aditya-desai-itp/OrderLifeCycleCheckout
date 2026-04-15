import { Icons } from "./icons";
import { Button } from "./buttons";
import { useAppStore } from "../hooks/useAppStore";

export const ConflictOverlay: React.FC = () => {
  const { state, dispatch } = useAppStore();
  
  if (!state.cartConflict) return null;

  return (
    <div className="fixed inset-0 z-100 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fade-in border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 text-orange-500 mb-4">
          <Icons.Alert className="w-8 h-8" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Cart Inconsistency Detected</h2>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
          We noticed a discrepancy between your saved cart and our current catalog (likely due to price changes or a stale session). We have recovered your items and updated them to the <strong className="text-slate-900 dark:text-white">current correct prices</strong>.
        </p>
        
        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-6 max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">Recovered Cart Snapshot</h3>
          {state.cartConflict.items.map(item => (
            <div key={item.id} className="flex justify-between items-center mb-3 last:mb-0 border-b border-slate-200 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-1">{item.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Qty: {item.qty}</p>
              </div>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">${(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => dispatch({ type: 'RESOLVE_CART_CONFLICT', payload: [] })}>
            Discard Cart
          </Button>
          <Button variant="primary" onClick={() => dispatch({ type: 'RESOLVE_CART_CONFLICT', payload: state.cartConflict!.items })}>
            Restore Items
          </Button>
        </div>
      </div>
    </div>
  );
};