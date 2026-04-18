import { useEffect, useRef, Suspense} from 'react';
import React from 'react';
import { useAppStore } from '../hooks/useAppStore';
import {generateCartChecksum } from '../utilities/securityGenerate';
import { deterministicRandom } from '../utilities/numberGenerate';
import type { AppState, Product } from '../types/types';
import { CatalogView } from './catalogView';
import { CartView } from './cartView';
import { DetailsView } from './detailsView';
import { PaymentView } from './paymentsView';
import { OrderStatusView } from './orderStatusView';
import { CheckoutProgress } from '../components/progressBar';
import { Icons } from '../components/icons';
import { ORDER_STATES } from '../types/types';
import { Logger } from '../utilities/Logger';
import { NotificationCenter } from '../components/notifications';
import { NotificationPanel } from '../components/notificationPanel';
import { ConflictOverlay } from '../components/conflictOverlay';

const LazyCatalog = React.lazy(() => Promise.resolve({ default: CatalogView }));
const LazyCart = React.lazy(() => Promise.resolve({ default: CartView }));
const LazyDetails = React.lazy(() => Promise.resolve({ default: DetailsView }));
const LazyPayment = React.lazy(() => Promise.resolve({ default: PaymentView }));
const LazyStatus = React.lazy(() => Promise.resolve({ default: OrderStatusView }));


export const Application: React.FC = () => {

  
  const { state, dispatch, notify } = useAppStore();

  // Initial Load & Hydration
  useEffect(() => {
    if (state.isHydrated) return; // Prevent double fetch in Strict Mode

    const initApp = async () => {
      try {
        const res = await fetch('https://fakestoreapi.com/products');
        const data = await res.json() as Product[];
        
        let massiveDataset: Product[] = [];
        for (let i = 0; i < 25; i++) {
          massiveDataset = [...massiveDataset, 
            ...data.map(p => ({ ...p, 
              id: `${p.id}_${i}`, 
              title: `${p.title} (Batch ${i+1})`,
            price: parseFloat((p.price + deterministicRandom(`${p.title} (Batch ${i+1})`)).toFixed(2)) }))];
        }

        const savedStr = localStorage.getItem('checkout_app_state');
        if (savedStr) {
          const parsed = JSON.parse(savedStr) as AppState;
          if (parsed.cart?.length > 0) {
            let isTampered = false;
            const actualHash = generateCartChecksum(parsed.cart);
            
            const correctedCart = parsed.cart.map(item => {
               const real = massiveDataset.find(p => p.id === item.id);
               if (!real || real.price !== item.price) isTampered = true;
               return { ...item, price: real ? real.price : item.price };
            }).filter(item => item.price > 0);

            if (actualHash !== parsed.cartHash || isTampered) {
               Logger.log('SEC_AUDIT', 'Hydration rejected due to stored tamper state. Rendering Conflict Overlay.');
               dispatch({ type: 'HYDRATE_STATE', payload: { ...parsed, cart: [], cartHash: '', isCheckoutLocked: false } });
               dispatch({ type: 'SET_CART_CONFLICT', payload: { items: correctedCart } });
            } else {
               dispatch({ type: 'HYDRATE_STATE', payload: { ...parsed, isCheckoutLocked: false } });
            }
          } else {
            dispatch({ type: 'HYDRATE_STATE', payload: { ...parsed, isCheckoutLocked: false } });
          }
        } else {
          dispatch({ type: 'HYDRATE_STATE', payload: {} });
        }
        dispatch({ type: 'SET_PRODUCTS', payload: massiveDataset });
        Logger.log('INFO', 'Application bootstrapped and hydrated.');
      } catch (err) { notify("Failed to load products", "error"); Logger.log('ERROR', 'Bootstrap failed'); }
    };
    initApp();
  }, [dispatch, notify, state.isHydrated]);

  // Persist Entire Global State
 useEffect(() => {
     if (!state.isHydrated || state.lastUpdateSource === 'sync') return;
    const stateToSave = {
      cart: state.cart, 
      cartHash: state.cartHash, 
      orderState: state.orderState,
      checkoutDetails: state.checkoutDetails,
      cartVersion: state.cartVersion,
      sortOption: state.sortOption,
      selectedCategories: state.selectedCategories,
      currentView: state.currentView,
      isDarkMode: state.isDarkMode,
      isCheckoutLocked: state.isCheckoutLocked,
      sharedPaymentActive: state.sharedPaymentActive,
      notificationHistory: state.notificationHistory,
    };
    const stringified = JSON.stringify(stateToSave);
    if (localStorage.getItem('checkout_app_state') !== stringified) {
       localStorage.setItem('checkout_app_state', stringified);
    }
  }, [state.cart, state.cartHash, state.orderState, state.notificationHistory,  
    state.cartVersion,state.sharedPaymentActive, state.checkoutDetails, state.currentView,
    state.isDarkMode,state.sortOption, state.selectedCategories, state.isHydrated, state.lastUpdateSource]);

  const versionRef = useRef(state.cartVersion);
  useEffect(() => { versionRef.current = state.cartVersion; }, [state.cartVersion]);

  // Multi-tab synchronization
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => { 
      if (e.key === 'checkout_app_state' && e.newValue) { 
        const newState = JSON.parse(e.newValue);
        if (newState.cartVersion < versionRef.current) return;
        if (newState.cartVersion === versionRef.current && newState.sharedPaymentActive === state.sharedPaymentActive && newState.isDarkMode === state.isDarkMode && newState.orderState === state.orderState) return;
        if (newState.cartVersion > versionRef.current) {
           notify("Cart modified in another tab", "info");
        }
        dispatch({ type: 'SYNC_FROM_OTHER_TAB', payload: newState });
        if (newState.isCheckoutLocked !== state.isCheckoutLocked) {
           dispatch({ type: 'LOCK_CHECKOUT', payload: newState.isCheckoutLocked });
        }
      } 
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [dispatch, state.cartVersion, state.isCheckoutLocked, notify]);

  // Handle Logo Click based on current state lifecycle
  const handleLogoClick = () => {
    if(isActionDisabled){
      return;
    }
    const isOrderComplete = state.orderState.includes(ORDER_STATES.ORDER_SUCCESS) || state.orderState.includes(ORDER_STATES.ORDER_SHIPPED) || state.orderState.includes(ORDER_STATES.ORDER_IN_TRANSIT) || state.orderState.includes(ORDER_STATES.ORDER_DELIVERED);
    if (isOrderComplete) {
       dispatch({ type: 'CLEAR_CART', payload: 'catalog'});
    } else {
       dispatch({ type: 'SET_VIEW', payload: 'catalog' });
    }
  };

  // Handle Cart Click based on current state lifecycle
  const handleCartClick = () => {
    if(isActionDisabled){
      return;
    }
    const isOrderComplete = state.orderState.includes(ORDER_STATES.ORDER_SUCCESS) || state.orderState.includes(ORDER_STATES.ORDER_SHIPPED) || state.orderState.includes(ORDER_STATES.ORDER_IN_TRANSIT) || state.orderState.includes(ORDER_STATES.ORDER_DELIVERED);
    if (isOrderComplete) {
       dispatch({ type: 'CLEAR_CART', payload: 'cart'});
    } else {
       dispatch({ type: 'SET_VIEW', payload: 'cart' });
    }
  };

  const isActionDisabled = state.isCheckoutLocked || state.sharedPaymentActive;

  const copyDiagnostics = () => {
    const logs = Logger.exportLogs();
    
    const textArea = document.createElement("textarea");
    textArea.value = logs;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      notify("Diagnostics Copied to Clipboard", "success");
    } catch (err) {
      notify("Failed to copy logs.", "error");
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className={`min-h-screen ${state.isDarkMode ? 'dark bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'} transition-colors duration-300 font-sans flex flex-col`}>  
       {/* Global Scrollbar Styling */}
       <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a1a1aa; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d97706; } /* Amber hover in dark mode */
      `}} />

      {state.cartConflict && (<ConflictOverlay/>)}

      {/* Notification Toasts */}
      <NotificationCenter/>

      {/* Notification Side Bar */}
      <NotificationPanel/>

      {/* Main Navbar */}
      <header className="sticky top-0 z-50 w-full bg-neutral-950 border-b border-neutral-900 shadow-sm text-neutral-50 h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={handleLogoClick}>
            <h1 className="text-2xl font-serif font-bold tracking-wide group-hover:text-amber-500 transition-colors">Secure<span className="font-sans font-light opacity-50 ml-1">SHOP</span></h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })} aria-label="Toggle theme" className="p-2 text-neutral-400 hover:text-amber-500 transition-colors">
              {state.isDarkMode ? <Icons.Sun /> : <Icons.Moon />}
            </button>
            <button onClick={() => dispatch({ type: 'TOGGLE_NOTIFICATION_PANEL', payload: true })} aria-label="View notifications" className="relative p-2 text-neutral-400 hover:text-amber-500 transition-colors">
              <Icons.Bell />
              {state.activeNotifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-rose-600 rounded-full border border-neutral-950"></span>}
            </button>
            <div className={`relative p-2 cursor-pointer text-neutral-400 hover:text-amber-500 transition-colors ${state.isCheckoutLocked || state.sharedPaymentActive ? 'opacity-50 pointer-events-none' : ''}`} onClick={() => { handleCartClick() }} aria-label="View Cart">
              <Icons.Cart />
              {state.cart.length > 0 && <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-neutral-950">{state.cart.reduce((sum, item) => sum + item.qty, 0)}</span>}
            </div>
          </div>
        </div>
      </header>

      {/* Dynamic Progress Bar */}
      <CheckoutProgress />

      {/* Dynamic View Router */}
      <div className="flex-grow">
        <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-900 dark:border-white"></div></div>}>
          {state.currentView === 'catalog' && <LazyCatalog />}
        {state.currentView === 'cart' && <LazyCart />}
        {state.currentView === 'details' && <LazyDetails />}
        {state.currentView === 'payment' && <LazyPayment />}
        {state.currentView === 'status' && <LazyStatus />}
        </Suspense>
      </div>
      
      {/* Footer with Diagnostics Copy */}
      <footer className="bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-900 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center text-xs text-neutral-500 gap-4">
          <p>&copy; 2026 SecureShop Commerce. All rights reserved.</p>
          <button onClick={copyDiagnostics} className="hover:text-amber-600 transition-colors flex items-center gap-1 uppercase tracking-widest font-medium">📋 Copy Developer Logs</button>
        </div>
      </footer>
    </div>
  );
};
