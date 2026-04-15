import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { generateCartChecksum, generateIdempotencyKey } from '../utilities/checksum';
import { useDebounce } from '../hooks/useDebounce';
import type { AppState, Product } from '../types/types';
import { ORDER_STATES } from '../types/types';
import { NotificationCenter } from './notificationCenter';
import { Icons } from './icons';
import { Button } from './buttons';
import { OrderTimeline } from './orderTimeline';
import { ProductCard } from './productCard';
import type { SortOption } from '../types/types';

export const Application: React.FC = () => {
  const { state, dispatch, notify } = useAppStore();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  // Performance Technique: Debounced search
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const categories = useMemo(() => {
    const cats = new Set(state.products.map(p => p.category));
    return ['all', ...Array.from(cats)];
  }, [state.products]);

  // Derived Data Pipeline: Filter -> Sort -> Paginate (Requirement A: Performance)
  const processedProducts = useMemo(() => {
    let result = state.products;

    // 1. Filter by Category
    if (!selectedCategories.includes('all')) {
      result = result.filter(p => selectedCategories.includes(p.category));
    }

    // 2. Filter by Search
    if (debouncedSearch) {
      const lowerQuery = debouncedSearch.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(lowerQuery));
    }

    // 3. Sort (Create shallow copy to avoid mutating original state)
    if (sortOption !== 'default') {
      result = [...result].sort((a, b) => {
        switch (sortOption) {
          case 'price_asc': return a.price - b.price;
          case 'price_desc': return b.price - a.price;
          case 'name_asc': return a.title.localeCompare(b.title);
          case 'name_desc': return b.title.localeCompare(a.title);
          default: return 0;
        }
      });
    }
    return result;
  }, [state.products, debouncedSearch, selectedCategories, sortOption]);

  // Reset to page 1 when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedCategories, sortOption]);

  const totalPages = Math.ceil(processedProducts.length / itemsPerPage) || 1;
  const currentProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedProducts.slice(start, start + itemsPerPage);
  }, [processedProducts, currentPage]);

  // Derived state (Cart Totals)
  const totals = useMemo(() => {
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = subtotal * 0.1; // 10% tax
    return { subtotal, tax, total: subtotal + tax };
  }, [state.cart]);

  // Initial Data Fetch & Mock Scaling (Requirement A: 500+ items)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('https://fakestoreapi.com/products');
        const data = await res.json();
        
        // Simulating a large dataset by duplicating products to reach ~500 items
        let massiveDataset: Product[] = [];
        for (let i = 0; i < 25; i++) {
          massiveDataset = [...massiveDataset, ...data.map((p: Product) => ({
            ...p,
            id: `${p.id}_${i}`, // Ensure unique IDs
            title: `${p.title} (Batch ${i+1})`
          }))];
        }
        dispatch({ type: 'SET_PRODUCTS', payload: massiveDataset });
      } catch (err) {
        notify("Failed to load products", "error");
      }
    };
    fetchProducts();

    // Hydrate state from localStorage (Edge Case: Refresh recovery)
    const savedState = localStorage.getItem('checkout_app_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState) as AppState;
        // Only hydrate safe fields
        dispatch({ type: 'HYDRATE_STATE', payload: { cart: parsed.cart, cartHash: parsed.cartHash, orderState: parsed.orderState } });
      } catch(e) { console.error("Hydration failed", e) }
    }
  }, [dispatch]);

  // Sync State to LocalStorage & Cross-Tab Detection (Requirement B)
  useEffect(() => {
    localStorage.setItem('checkout_app_state', JSON.stringify({
      cart: state.cart,
      cartHash: state.cartHash,
      orderState: state.orderState
    }));
  }, [state.cart, state.cartHash, state.orderState]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'checkout_app_state') {
        notify("Cart updated in another tab!", "warning");
        // In a real app, we would dispatch HYDRATE_STATE here to sync the tabs
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [notify]);


  // // Derived View: Filtered Products
  // const visibleProducts = useMemo(() => {
  //   if (!debouncedSearch) return state.products.slice(0, 50); // Pagination/Limit for initial render performance
  //   return state.products.filter(p => p.title.toLowerCase().includes(debouncedSearch.toLowerCase())).slice(0, 50);
  // }, [state.products, debouncedSearch]);


  // --- ORCHESTRATION & SECURITY LOGIC ---

  const handleCheckoutValidation = () => {
    // 1. Validation: Prevent multiple clicks
    if (state.isCheckoutLocked) return;
    dispatch({ type: 'LOCK_CHECKOUT', payload: true });

    // 2. Tampering Detection: Checksum Verification
    const currentHash = generateCartChecksum(state.cart);
    if (currentHash !== state.cartHash) {
      notify("Security Alert: Cart tampering detected! Price mismatch.", "error");
      dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.CART_READY });
      dispatch({ type: 'LOCK_CHECKOUT', payload: false });
      return;
    }

    // 3. Set Idempotency Key
    const idKey = generateIdempotencyKey();
    dispatch({ type: 'SET_IDEMPOTENCY_KEY', payload: idKey });
    
    // Transition State
    dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.CHECKOUT_VALIDATED });
    notify("Validation passed. Processing order...", "success");

    // Proceed to Submit
    simulateOrderSubmission(idKey);
  };

  const simulateOrderSubmission = async (idempotencyKey:string) => {
    dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.ORDER_SUBMITTED });

    try {
      // API Delay Simulation
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ cart: state.cart, total: totals.total })
      });

      if (!response.ok) throw new Error("API Rejected");

      // Randomly simulate a network inconsistency edge case (10% chance)
      if (Math.random() < 0.1) {
        dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.ORDER_INCONSISTENT });
        notify("Order state inconsistent. UI disconnected from backend.", "warning");
      } else {
        dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.ORDER_SUCCESS });
        notify("Order placed successfully!", "success");
        setTimeout(() => dispatch({ type: 'CLEAR_CART' }), 3000); // Clear after success
      }
    } catch (error) {
      dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.ORDER_FAILED });
      notify("Order failed. Please retry.", "error");
    } finally {
      dispatch({ type: 'LOCK_CHECKOUT', payload: false });
    }
  };


  // --- RENDER ---
  return (
    <div className={`min-h-screen ${state.isDarkMode ? 'dark bg-slate-900' : 'bg-slate-50'} transition-colors duration-300 font-sans`}>
      <NotificationCenter />
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-blue-900 dark:bg-slate-950 border-b border-blue-800 dark:border-slate-800 shadow-sm text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div> */}
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-xl">S</div>
            {/* <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">SecureShop</h1> */}
            <h1 className="text-xl font-bold hidden sm:block">SecureShop</h1>
          </div>
          {/* Search & Actions */}
          <div className="flex-1 max-w-md mx-4">
            <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-4 py-2 outline-none" />
            
            {/* <input 
              type="text" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 rounded-lg px-4 py-2 outline-none transition-all"
            /> */}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })} className="p-2 text-blue-100 hover:bg-blue-800 dark:hover:bg-slate-800 rounded-full">
              {state.isDarkMode ? <Icons.Sun className="w-5 h-5"/> : <Icons.Moon className="w-5 h-5"/>}
            </button>
            <div className="relative">
              <Icons.Cart className="w-6 h-6"/>
              {state.cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {state.cart.reduce((sum, item) => sum + item.qty, 0)}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        {/* PRODUCT GRID SECTION */}
        <section className="flex-1 order-2 lg:order-1">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
            
            {/* <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-4 py-2 outline-none" />
             */}
            <div className=" w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-1 sm:mb-0">
              {/* <select 
                aria-label="Filter by Category"
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 sm:w-auto bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 capitalize outline-none focus:border-blue-500">
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select> */}
              <div className="flex flex-wrap gap-3">
                {categories.map((cat) => (
                  <label
                    key={cat}
                    className="flex-1 sm:w-auto bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 capitalize outline-none focus:border-blue-500">
                  <input
                      type="checkbox"
                      value={cat}
                      checked={selectedCategories.includes(cat)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories([...selectedCategories, cat]);
                        } else {
                          setSelectedCategories(
                            selectedCategories.filter((c) => c !== cat)
                          );
                        }
                      }}
                      className="accent-blue-500"
                    />

                    {cat}
                  </label>
                ))}
              </div>

              <select 
                aria-label="Sort Products"
                value={sortOption} 
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="flex-1 sm:w-auto bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 outline-none focus:border-blue-500">
                <option value="default">Sort By: Recommended</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {state.products.length === 0 ? (
            <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
          ) : currentProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">No products match your filters.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {currentProducts.map(product => (
                  <ProductCard key={product.id} product={product} onAddToCart={(p) => { dispatch({ type: 'ADD_TO_CART', payload: p }); notify(`Added to cart`, 'success'); }} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav aria-label="Pagination" className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-6">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, processedProducts.length)}</span> of <span className="font-medium">{processedProducts.length}</span> results
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} aria-label="Previous Page" className="px-3">
                      <Icons.ChevronLeft className="w-5 h-5"/>
                    </Button>
                    <div className="flex items-center px-4 font-medium text-slate-900 dark:text-slate-50">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} aria-label="Next Page" className="px-3">
                      <Icons.ChevronRight className="w-5 h-5"/>
                    </Button>
                  </div>
                </nav>
              )}
            </>
          )}
        </section>


        {/* CART & CHECKOUT SIDEBAR (Right Side) */}
        <aside className="w-full lg:w-96 order-1 lg:order-2">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 sticky top-24 border border-slate-200 dark:border-slate-700">
            <OrderTimeline />
            
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Your Cart</h2>
              <button onClick={() => dispatch({ type: 'SIMULATE_TAMPERING' })} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded">Simulate Tamper</button>
            </div>

            {state.cart.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400"><Icons.Cart className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>Your cart is empty.</p></div>
            ) : (
              <>
                <div className="max-h-64 overflow-y-auto pr-2 mb-6 space-y-4">
                  {state.cart.map(item => (
                    <div key={item.id} className="flex gap-4 items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                      <img src={item.image} alt="" className="w-12 h-12 object-contain mix-blend-multiply dark:mix-blend-normal" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50 line-clamp-1">{item.title}</h4>
                        <p className="text-xs text-slate-500">${item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => dispatch({ type: 'UPDATE_CART_QTY', payload: { id: item.id, qty: item.qty - 1 } })} className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300">-</button>
                        <span className="text-sm w-4 text-center dark:text-white">{item.qty}</span>
                        <button onClick={() => dispatch({ type: 'UPDATE_CART_QTY', payload: { id: item.id, qty: item.qty + 1 } })} className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300">+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2 mb-6">
                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                    <span>Subtotal</span>
                    <span>${totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                    <span>Tax (10%)</span>
                    <span>${totals.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-slate-50 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>Total</span>
                    <span>${totals.total.toFixed(2)}</span>
                  </div>
                </div>

                {state.orderState === ORDER_STATES.ORDER_SUCCESS ? (
                  <Button variant="success" className="w-full py-3" onClick={() => dispatch({ type: 'CLEAR_CART' })}>
                    Start New Order
                  </Button>
                ) : (state.orderState === ORDER_STATES.ORDER_FAILED || state.orderState === ORDER_STATES.ORDER_INCONSISTENT) ? (
                  <div className="flex gap-2">
                     <Button variant="primary" className="flex-1 py-3" onClick={handleCheckoutValidation} disabled={state.isCheckoutLocked}>
                      Retry Checkout
                    </Button>
                    <Button variant="danger" className="flex-1 py-3" onClick={() => dispatch({ type: 'TRANSITION_STATE', payload: ORDER_STATES.CART_READY })}>
                      Rollback
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="accent" 
                    className="w-full py-3 flex justify-center items-center gap-2" 
                    onClick={handleCheckoutValidation} 
                    disabled={state.isCheckoutLocked || state.cart.length === 0}>
                  
                    {state.isCheckoutLocked ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : 'Secure Checkout'}
                  </Button>
                )}
              </>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};