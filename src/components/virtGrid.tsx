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
              <div className="bg-white dark:bg-neutral-900 rounded-sm shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow group">
                <div className="h-44 bg-white dark:bg-neutral-800 p-6 flex justify-center items-center relative overflow-hidden">
                  <img src={item.image} alt={item.title} className="h-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4 flex flex-col flex-grow border-t border-neutral-100 dark:border-neutral-800">
                  <h3 className="font-serif font-medium text-sm text-neutral-900 dark:text-neutral-50 line-clamp-2 mb-1 leading-snug">{item.title}</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">{item.category}</p>
                  <div className="mt-auto flex justify-between items-center">
                    <span className="text-base font-bold text-neutral-900 dark:text-amber-500">${item.price.toFixed(2)}</span>
                    {cartItem ? (
                      <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded p-1 border border-neutral-200 dark:border-neutral-700">
                        <button disabled={isActionDisabled} onClick={() => dispatch({ type: 'UPDATE_CART_QTY', payload: { id: item.id, qty: cartItem.qty - 1 } })} aria-label="Decrease quantity" className="w-7 h-7 flex items-center justify-center bg-white dark:bg-neutral-700 rounded text-neutral-700 dark:text-white shadow-sm dark:hover:bg-amber-600 hover:bg-neutral-50 disabled:opacity-50">-</button>
                        <span className="text-xs font-medium w-5 text-center text-neutral-900 dark:text-white" aria-live="polite">{cartItem.qty}</span>
                        <button disabled={isActionDisabled} onClick={() => { dispatch({ type: 'UPDATE_CART_QTY', payload: { id: item.id, qty: cartItem.qty + 1 } }); notify(`Added ${item.title.substring(0,10)}...`, 'success'); }} aria-label="Increase quantity" className="w-7 h-7 flex items-center justify-center bg-white dark:bg-neutral-700 rounded text-neutral-700 dark:text-white shadow-sm dark:hover:bg-amber-600 hover:bg-neutral-50 disabled:opacity-50">+</button>
                      </div>
                    ) : (
                      <Button disabled={isActionDisabled} onClick={() => { dispatch({ type: 'ADD_TO_CART', payload: item }); notify(`Added ${item.title.substring(0,10)}...`, 'success'); }} variant="outline" className="py-1 px-4 text-xs hover:bg-neutral-900 hover:text-white dark:hover:bg-amber-600 dark:hover:text-white dark:hover:border-amber-600">Add</Button>
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