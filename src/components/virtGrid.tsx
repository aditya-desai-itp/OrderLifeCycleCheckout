import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import type { Product } from '../types/types';
import { Button } from './buttons';

export const VirtualGrid: React.FC<{ items: Product[]; cardHeight: number }> = ({ items, cardHeight }) => {
  const { state, dispatch, notify } = useAppStore();
  const [scrollTop, setScrollTop] = useState(0);
  const [cols, setCols] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize Observer to dynamically calculate grid columns
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (width >= 1280) setCols(4);
      else if (width >= 1024) setCols(3);
      else if (width >= 640) setCols(2);
      else setCols(1);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const totalRows = Math.ceil(items.length / cols);
  const totalHeight = totalRows * cardHeight;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  const startRow = Math.max(0, Math.floor(scrollTop / cardHeight) - 1);
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / cardHeight) + 1);

  const visibleItems = [];
  for (let r = startRow; r < endRow; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx < items.length) visibleItems.push({ item: items[idx], r, c, idx });
    }
  }

  // Cross-Tab Lock Check
  const isActionDisabled = state.isCheckoutLocked || state.sharedPaymentActive;
  
  return (
    <div ref={containerRef} style={{ height: '70vh', overflowY: 'auto' }} onScroll={e => setScrollTop(e.currentTarget.scrollTop)} className="relative custom-scrollbar w-full">
      <div style={{ height: totalHeight, position: 'relative', width: '100%' }}>
        {visibleItems.map(({ item, r, c }) => {
          const cartItem = state.cart.find(i => i.id === item.id);
          const top = r * cardHeight;
          const left = `${(c / cols) * 100}%`;
          const width = `${100 / cols}%`;
          
          return (
            <div key={item.id} style={{ position: 'absolute', top, left, width, height: cardHeight }} className="p-3">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="h-40 bg-slate-50 dark:bg-slate-900 p-4 flex justify-center items-center"><img src={item.image} alt={item.title} className="h-full object-contain mix-blend-multiply dark:mix-blend-normal" loading="lazy" /></div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-50 line-clamp-2 mb-1">{item.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 capitalize">{item.category}</p>
                  <div className="mt-auto flex justify-between items-center">
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400">${item.price.toFixed(2)}</span>
                    {cartItem ? (
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                        <button disabled={isActionDisabled} onClick={() => dispatch({ type: 'UPDATE_CART_QTY', payload: { id: item.id, qty: cartItem.qty - 1 } })} className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-600 rounded text-slate-700 dark:text-white shadow-sm hover:bg-slate-50 disabled:opacity-50">-</button>
                        <span className="text-xs font-medium w-5 text-center text-slate-900 dark:text-white">{cartItem.qty}</span>
                        <button disabled={isActionDisabled} onClick={() => { dispatch({ type: 'UPDATE_CART_QTY', payload: { id: item.id, qty: cartItem.qty + 1 } }); notify(`Added ${item.title.substring(0,10)}...`, 'success'); }} className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-600 rounded text-slate-700 dark:text-white shadow-sm hover:bg-slate-50 disabled:opacity-50">+</button>
                      </div>
                    ) : (
                      <Button disabled={isActionDisabled} onClick={() => { dispatch({ type: 'ADD_TO_CART', payload: item }); notify(`Added ${item.title.substring(0,10)}...`, 'success'); }} variant="accent" className="py-1 px-3 text-xs">Add</Button>
                    )}
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