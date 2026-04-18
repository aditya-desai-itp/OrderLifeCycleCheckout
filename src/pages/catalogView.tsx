import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { useDebounce } from '../hooks/useDebounce';
import type { SortOption } from '../types/types';   
import { VirtualGrid } from '../components/virtGrid';
import { Button } from '../components/buttons';
import { Icons } from '../components/icons';

export const CatalogView: React.FC = () => {
  const { state, dispatch} = useAppStore();
  
  const [localSearch, setLocalSearch] = useState(state.searchQuery);
  const debouncedSearch = useDebounce(localSearch, 300);
  const [visibleCount, setVisibleCount] = useState(12);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

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
    <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-4 sm:py-8 animate-fade-in relative">
      
      {/* Sticky Mobile Action Bar (Hidden on Desktop) */}
      <div className="flex md:hidden sticky top-[64px] z-30 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 p-3 gap-3 shadow-sm">
        <button onClick={() => setIsMobileSearchOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-neutral-100 dark:bg-neutral-800 py-2 rounded-sm text-sm font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
          <Icons.Search /> Search
        </button>
        <button onClick={() => setIsMobileFilterOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-neutral-100 dark:bg-neutral-800 py-2 rounded-sm text-sm font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 relative">
          <Icons.Filter /> Sort & Filter
          {state.selectedCategories.length > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-rose-900 rounded-full"></span>}
        </button>
      </div>

      {/* Mobile Search Top Overlay */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/50 pointer-events-auto md:hidden">
          <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-neutral-900 p-8 rounded-b-2xl flex flex-col animate-slide-down md:hidden shadow-md">
            {/* <div className="bg-white dark:bg-neutral-900 p-6 rounded-b-2xl animate-slide-down h-1/4 flex flex-col"> */}
            <div className="flex justify-between items-center mb-6">
            <h2 className="font-serif text-xl font-bold">Search</h2>
            <button onClick={() => setIsMobileSearchOpen(false)} aria-label="Close search"><Icons.Close className="w-6 h-6"/></button>
          </div>
          <input autoFocus type="text" placeholder="Search products..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-300 dark:border-neutral-700 focus:border-amber-500 rounded-md px-4 py-3 outline-none" />
          <Button onClick={() => setIsMobileSearchOpen(false)} className="mt-6">View Results</Button>
        </div>
        </div>
      )}

      {/* Mobile Filter Bottom Slide-over */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 md:hidden">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-t-2xl animate-slide-up h-3/4 flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <h2 className="font-serif text-xl font-bold">Sort & Filter</h2>
              <button onClick={() => setIsMobileFilterOpen(false)} aria-label="Close filters"><Icons.Close className="w-6 h-6"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">Sort By</h3>
              <select value={state.sortOption} onChange={(e) => dispatch({ type: 'SET_UI_STATE', payload: { sortOption: e.target.value as SortOption }})} className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md px-4 py-3 outline-none mb-6">
                <option value="default">Recommended</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
              </select>

              <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">Categories</h3>
              <div className="flex flex-col gap-2">
                {categories.map(cat => (
                  <label key={cat} className="flex items-center gap-3 p-2 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800">
                    <input type="checkbox" checked={state.selectedCategories.includes(cat)} onChange={() => toggleCategory(cat)} className="w-5 h-5 accent-amber-600 rounded border-neutral-300 focus:ring-amber-500" />
                    <span className="capitalize text-neutral-800 dark:text-neutral-200">{cat}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="pt-4 flex gap-3">
              <Button variant="outline" onClick={() => dispatch({ type: 'SET_UI_STATE', payload: { selectedCategories: [] }})} className="w-1/3">Clear</Button>
              <Button onClick={() => setIsMobileFilterOpen(false)} className="flex-1">Apply Filters</Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Standard Control Bar */}
      <div className="hidden md:flex bg-white dark:bg-neutral-900 p-4 rounded-sm shadow-sm border border-neutral-200 dark:border-neutral-800 mb-6 flex-col gap-4 mx-4 sm:mx-0">
        <div className="flex justify-between gap-4">
          <input type="text" placeholder="Search essentials..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="w-64 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 border border-neutral-200 dark:border-neutral-800 focus:border-amber-500 rounded-sm px-4 py-2 outline-none transition-all" />
          <select aria-label="Sort options" value={state.sortOption} onChange={(e) => dispatch({ type: 'SET_UI_STATE', payload: { sortOption: e.target.value as SortOption }})} className="w-auto text-xs uppercase tracking-wide font-bold bg-neutral-50 dark:bg-neutral-950 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded-sm px-4 py-2 outline-none focus:border-amber-500">
            <option value="default">Sort By: Recommended</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name_asc">Name: A to Z</option>
            <option value="name_desc">Name: Z to A</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-neutral-500 uppercase tracking-widest font-bold mr-2">Filters:</span>
          {categories.map(cat => (
            <button key={cat} onClick={() => toggleCategory(cat)} className={`px-4 py-1.5 rounded-sm text-xs font-medium capitalize border transition-all ${state.selectedCategories.includes(cat) ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-amber-600 dark:border-amber-600' : 'bg-transparent border-neutral-300 text-neutral-600 hover:border-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500'}`}>{cat}</button>
          ))}
          {state.selectedCategories.length > 0 && <button onClick={() => dispatch({ type: 'SET_UI_STATE', payload: { selectedCategories: [] }})} className="text-xs text-rose-900 dark:text-rose-500 ml-2 font-bold uppercase tracking-wider hover:underline">Clear All</button>}
        </div>
      </div>

      {state.products.length === 0 ? (
        <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-900 dark:border-white"></div></div>
      ) : processedProducts.length === 0 ? (
        <div className="text-center py-16 text-neutral-500 dark:text-neutral-400 font-serif text-lg">No products match your curation.</div>
      ) : (
        <VirtualGrid items={processedProducts} cardHeight={360} />
      )}
    </div>
  );
};