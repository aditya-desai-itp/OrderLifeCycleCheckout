import { useState } from "react";
import type { CartItem } from "../types/types";
import { useAppStore } from "../hooks/useAppStore";

export const VirtualCartList: React.FC<{ items: CartItem[]; rowHeight: number; containerHeight: number }> = ({ items, rowHeight, containerHeight }) => {
  const { state, dispatch, notify } = useAppStore();
  const [scrollTop, setScrollTop] = useState(0);
  
  const totalHeight = items.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 2); // Buffer of 2 items
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + 2);
  const visibleItems = items.slice(startIndex, endIndex);

  const isActionDisabled = state.isCheckoutLocked || state.sharedPaymentActive;


  return (
        // 


    <div style={{ height: containerHeight, overflowY: 'auto' }} onScroll={e => setScrollTop(e.currentTarget.scrollTop)} className="bg-white dark:bg-neutral-900 rounded-sm shadow-sm border border-neutral-200 dark:border-neutral-800 border-t-4 border-t-rose-900 relative custom-scrollbar pr-2">
        <div style={{ height: totalHeight, position: 'relative' }}> 
        {visibleItems.map((item, idx) => {
          const absoluteTop = (startIndex + idx) * rowHeight;
          return (
            <div key={item.id} style={{ position: 'absolute', top: absoluteTop, height: rowHeight, width: '100%' }} className="p-2 sm:p-4">
               <div className={`flex gap-4 items-stretch p-4 h-full bg-neutral-50 dark:bg-neutral-950 rounded-md border border-neutral-200 dark:border-neutral-800`}>
                 <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-white dark:bg-neutral-800 rounded p-2 flex items-center justify-center">
                   <img src={item.image} alt={item.title} className="max-h-full max-w-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                 </div>
            
            <div className="flex-1 flex flex-col justify-between py-1">
              <div>
                <h4 className="text-sm sm:text-base font-serif font-medium text-neutral-900 dark:text-neutral-50 line-clamp-2 leading-tight mb-1">{item.title}</h4>
                <p className="text-xs text-neutral-500 tracking-wider uppercase mb-2">Ref: {item.id}</p>
              </div>
              
              <div className="flex flex-row justify-between items-center gap-2 mt-auto flex-nowrap">
                    <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-sm p-0.5 sm:p-1 flex-shrink-0">
                      <button disabled={isActionDisabled} aria-label="Decrease quantity" onClick={() => dispatch({ type: 'UPDATE_CART_QTY', payload: { id: item.id, qty: item.qty - 1 } })} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 rounded-sm text-neutral-700 dark:text-white dark:hover:bg-amber-600 hover:bg-neutral-200 disabled:opacity-50 transition-colors">-</button>
                      <span className="text-xs sm:text-sm font-medium w-5 sm:w-6 text-center text-neutral-900 dark:text-white" aria-live="polite">{item.qty}</span>
                      <button disabled={isActionDisabled} aria-label="Increase quantity" onClick={() => { dispatch({ type: 'UPDATE_CART_QTY', payload: { id: item.id, qty: item.qty + 1 } }); notify(`Added another ${item.title.substring(0,10)}...`, 'success'); }} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 rounded-sm text-neutral-700 dark:text-white dark:hover:bg-amber-600 hover:bg-neutral-200 disabled:opacity-50 transition-colors">+</button>
                    </div>
                    <span className="text-base sm:text-xl font-bold text-neutral-900 dark:text-amber-500 whitespace-nowrap truncate flex-shrink-0">${(item.price * item.qty).toFixed(2)}</span>
                  </div>
            </div>
          </div>
          </div>
        )
        })}
      </div>
      </div>
  );
};
