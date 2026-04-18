import { Icons } from "./icons";
import { Button } from "./buttons";
import { useAppStore } from "../hooks/useAppStore";

export const ConflictOverlay: React.FC = () => {
  const { state, dispatch } = useAppStore();
  
  if (!state.cartConflict) return null;

  return (
        <div className="fixed inset-0 z-[100] bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-sm shadow-2xl max-w-lg w-full p-6 sm:p-8 animate-fade-in border border-neutral-200 dark:border-neutral-800 border-t-4 border-t-rose-900">
            <div className="flex items-center gap-3 text-rose-700 dark:text-rose-500 mb-4">
              <Icons.Alert className="w-8 h-8" />
              <h2 className="text-2xl font-serif font-bold text-neutral-900 dark:text-white">Cart Conflict Detected</h2>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6 leading-relaxed">
              We noticed a discrepancy between your saved session and our current catalog (likely due to price changes or tampering). We have recovered your items and updated them to the <strong className="text-neutral-900 dark:text-white">current verified prices</strong>.
            </p>
            
            <div className="bg-neutral-50 dark:bg-neutral-950 rounded-sm p-4 mb-8 max-h-60 overflow-y-auto border border-neutral-200 dark:border-neutral-800 custom-scrollbar">
              <h3 className="text-xs font-bold text-neutral-500 uppercase mb-4 tracking-widest">Recovered Cart Snapshot</h3>
              {state.cartConflict.items.map(item => (
                <div key={item.id} className="flex justify-between items-center mb-4 last:mb-0 border-b border-neutral-200 dark:border-neutral-800 pb-3 last:border-0 last:pb-0">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-serif font-medium text-neutral-900 dark:text-neutral-100 line-clamp-1">{item.title}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 uppercase tracking-wider">Qty: {item.qty}</p>
                  </div>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-500">${(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <Button variant="outline" className="w-full sm:w-auto uppercase tracking-widest text-xs" onClick={() => dispatch({ type: 'RESOLVE_CART_CONFLICT', payload: [] })}>
                Discard Cart
              </Button>
              <Button variant="primary" className="w-full sm:w-auto uppercase tracking-widest text-xs" onClick={() => dispatch({ type: 'RESOLVE_CART_CONFLICT', payload: state.cartConflict!.items })}>
                Restore Items
              </Button>
            </div>
          </div>
        </div>
      )};