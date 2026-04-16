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
    <div style={{ height: containerHeight, overflowY: 'auto' }} onScroll={e => setScrollTop(e.currentTarget.scrollTop)} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative custom-scrollbar">
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, idx) => {
          const absoluteTop = (startIndex + idx) * rowHeight;
          return (
            <div key={item.id} style={{ position: 'absolute', top: absoluteTop, height: rowHeight, width: '100%' }} className="p-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-xl h-full border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                <img src={item.image} alt="" className="w-16 h-16 object-contain mix-blend-multiply dark:mix-blend-normal bg-white dark:bg-slate-800 rounded-lg p-2" />
                <div className="flex-1 text-center sm:text-left"><h4 className="text-base font-semibold text-slate-900 dark:text-slate-50 line-clamp-1">{item.title}</h4><p className="text-sm text-slate-500">${item.price.toFixed(2)} each</p></div>
                <div className="flex flex-col items-center sm:items-end gap-2">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">${(item.price * item.qty).toFixed(2)}</span>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-1">
                    <button disabled={isActionDisabled} onClick={() => dispatch({ type: 'UPDATE_CART_QTY', payload: { id: item.id, qty: item.qty - 1 } })} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 disabled:opacity-50">-</button>
                    <span className="text-sm font-medium w-6 text-center text-slate-900 dark:text-white">{item.qty}</span>
                    <button disabled={isActionDisabled} onClick={() => { dispatch({ type: 'UPDATE_CART_QTY', payload: { id: item.id, qty: item.qty + 1 } }); notify(`Added another ${item.title.substring(0,10)}...`, 'success'); }} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 disabled:opacity-50">+</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
