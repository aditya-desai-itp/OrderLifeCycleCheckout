import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { useDebounce } from '../hooks/useDebounce';
import { Button } from '../components/buttons';
import type { SortOption } from '../types/types';   

export const CatalogView: React.FC = () => {
  const { state, dispatch, notify } = useAppStore();
  
  const [localSearch, setLocalSearch] = useState(state.searchQuery);
  const debouncedSearch = useDebounce(localSearch, 300);
  const [visibleCount, setVisibleCount] = useState(12);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Sync search state
  useEffect(() => {
    if (debouncedSearch !== state.searchQuery) dispatch({ type: 'SET_UI_STATE', payload: { searchQuery: debouncedSearch } });
  }, [debouncedSearch, state.searchQuery, dispatch]);

  // Reset infinite scroll on filter change
  useEffect(() => { setVisibleCount(12); }, [debouncedSearch, state.selectedCategories, state.sortOption]);

  const categories = useMemo(() => Array.from(new Set(state.products.map(p => p.category))), [state.products]);

  const processedProducts = useMemo(() => {
    let result = state.products;
    if (state.selectedCategories.length > 0) result = result.filter(p => state.selectedCategories.includes(p.category));
    if (state.searchQuery) result = result.filter(p => p.title.toLowerCase().includes(state.searchQuery.toLowerCase()));
    if (state.sortOption !== 'default') {
      result = [...result].sort((a, b) => {
        if (state.sortOption === 'price_asc') return a.price - b.price;
        if (state.sortOption === 'price_desc') return b.price - a.price;
        if (state.sortOption === 'name_asc') return a.title.localeCompare(b.title);
        if (state.sortOption === 'name_desc') return b.title.localeCompare(a.title);
        return 0;
      });
    }
    return result;
  }, [state.products, state.searchQuery, state.selectedCategories, state.sortOption]);

  const currentProducts = useMemo(() => processedProducts.slice(0, visibleCount), [processedProducts, visibleCount]);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleCount < processedProducts.length) {
        setVisibleCount(prev => prev + 12);
      }
    }, { threshold: 0.1 });
    
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [visibleCount, processedProducts.length]);

  const toggleCategory = (cat: string) => {
    const newCats = state.selectedCategories.includes(cat) ? state.selectedCategories.filter(c => c !== cat) : [...state.selectedCategories, cat];
    dispatch({ type: 'SET_UI_STATE', payload: { selectedCategories: newCats } });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <input type="text" placeholder="Search products..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full sm:w-64 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-4 py-2 outline-none transition-all" />
          
          <select value={state.sortOption} onChange={(e) => dispatch({ type: 'SET_UI_STATE', payload: { sortOption: e.target.value as SortOption }})}
            className="w-full sm:w-auto bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 outline-none focus:border-blue-500">
            <option value="default">Sort By: Recommended</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name_asc">Name: A to Z</option>
            <option value="name_desc">Name: Z to A</option>
          </select>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium mr-2">Filters:</span>
          {categories.map(cat => (
            <button key={cat} onClick={() => toggleCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize border transition-all ${
                state.selectedCategories.includes(cat) ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}>{cat}</button>
          ))}
          {state.selectedCategories.length > 0 && <button onClick={() => dispatch({ type: 'SET_UI_STATE', payload: { selectedCategories: [] }})} className="text-xs text-blue-600 dark:text-blue-400 ml-2 font-medium">Clear All</button>}
        </div>
      </div>

      {state.products.length === 0 ? (
        <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
      ) : currentProducts.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">No products match your search/filters.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {currentProducts.map(product => {
              const cartItem = state.cart.find(i => i.id === product.id);
              return (
                <div key={product.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                  <div className="h-48 bg-slate-50 dark:bg-slate-900 p-4 flex justify-center items-center">
                    <img src={product.image} alt={product.title} className="h-full object-contain mix-blend-multiply dark:mix-blend-normal" loading="lazy" />
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-50 line-clamp-2 mb-1">{product.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 capitalize">{product.category}</p>
                    <div className="mt-auto flex justify-between items-center">
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">${product.price.toFixed(2)}</span>
                      {cartItem ? (
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                          <button disabled={state.isCheckoutLocked} onClick={() => dispatch({ type: 'UPDATE_CART_QTY', payload: { id: product.id, qty: cartItem.qty - 1 } })} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-600 rounded text-slate-700 dark:text-white shadow-sm hover:bg-slate-50 disabled:opacity-50">-</button>
                          <span className="text-sm font-medium w-6 text-center text-slate-900 dark:text-white">{cartItem.qty}</span>
                          <button disabled={state.isCheckoutLocked} onClick={() => { dispatch({ type: 'UPDATE_CART_QTY', payload: { id: product.id, qty: cartItem.qty + 1 } }); notify(`Added ${product.title}`, 'success'); }} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-600 rounded text-slate-700 dark:text-white shadow-sm hover:bg-slate-50 disabled:opacity-50">+</button>
                        </div>
                      ) : (
                        <Button disabled={state.isCheckoutLocked} onClick={() => { dispatch({ type: 'ADD_TO_CART', payload: product }); notify(`Added ${product.title}`, 'success'); }} variant="accent" className="py-1.5 px-4 text-sm">
                          Add to Cart
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Intersection Observer Target for Lazy Loading */}
          {visibleCount < processedProducts.length && (
            <div ref={loaderRef} className="py-4 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </>
      )}
    </div>
  );
};