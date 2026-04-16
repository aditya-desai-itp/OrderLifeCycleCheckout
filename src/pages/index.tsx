import { useEffect, useMemo, useRef, useState } from 'react';
import React from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { deterministicRandom, generateCartChecksum, generateIdempotencyKey } from '../utilities/checksum';
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

  // Persist Entire Global State (Excluding ephemeral flags)
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
      // currentView: state.currentView,
      isDarkMode: state.isDarkMode,
      isCheckoutLocked: state.isCheckoutLocked,
      //isPaymentPageActive: state.isPaymentPageActive,
      sharedPaymentActive: state.sharedPaymentActive,
      notificationHistory: state.notificationHistory,
    };
    const stringified = JSON.stringify(stateToSave);
    if (localStorage.getItem('checkout_app_state') !== stringified) {
       localStorage.setItem('checkout_app_state', stringified);
    }//state.currentView,
  }, [state.cart, state.cartHash, state.orderState, state.notificationHistory,  
    state.cartVersion,state.sharedPaymentActive, state.checkoutDetails, 
    state.isDarkMode,state.sortOption, state.selectedCategories, state.isHydrated, state.lastUpdateSource]);

  const versionRef = useRef(state.cartVersion);
  useEffect(() => { versionRef.current = state.cartVersion; }, [state.cartVersion]);

  // Multi-tab synchronization
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => { 
      if (e.key === 'checkout_app_state' && e.newValue) { 
        const newState = JSON.parse(e.newValue);
        if (newState.cartVersion > versionRef.current) {
           notify("Cart modified in another tab", "info");
        }
        dispatch({ type: 'SYNC_FROM_OTHER_TAB', payload: newState });
        // dispatch({ type: 'HYDRATE_STATE', payload: newState });
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
    
    // IFrame Safe Clipboard Copy
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
    <div className={`min-h-screen ${state.isDarkMode ? 'dark bg-slate-900' : 'bg-slate-50'} transition-colors duration-300 font-sans flex flex-col`}>
      
      {/* GLOBAL OVERLAYS */}
      {state.cartConflict && (<ConflictOverlay/>)}
      {/* NOTIFICATION TOASTS*/}
      <NotificationCenter/>
      {/* NOTIFICATION TOASTS
      <div aria-live="polite" className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {state.activeNotifications.map(note => (
          <div key={note.id} className={`pointer-events-auto flex items-center justify-between p-4 rounded-lg shadow-lg text-white ${note.type === 'success' ? 'bg-green-600' : note.type === 'error' ? 'bg-red-600' : note.type === 'warning' ? 'bg-orange-500' : 'bg-blue-600'}`}>
            <div className="flex gap-3"><p className="text-sm font-medium">{note.message}</p></div>
            <button onClick={() => dispatch({ type: 'REMOVE_ACTIVE_NOTIFICATION', payload: note.id })} className="text-white/80 hover:text-white">×</button>
          </div>
        ))}
      </div> */}
      <NotificationPanel/>
      {/* NOTIFICATION SIDEBAR*/}
      {/*state.isNotificationPanelOpen && <div className="fixed inset-0 bg-slate-900/30 z-[80]" onClick={() => dispatch({ type: 'TOGGLE_NOTIFICATION_PANEL', payload: false })} />}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-slate-800 shadow-2xl z-[85] transform transition-transform duration-300 ${state.isNotificationPanelOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between">
          <h2 className="font-bold text-slate-900 dark:text-white">Notifications</h2>
          <button onClick={() => dispatch({ type: 'TOGGLE_NOTIFICATION_PANEL', payload: false })} className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><Icons.Close className="w-5 h-5"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {state.notificationHistory.map((note, idx) => (
             <div key={idx} className="p-3 border rounded text-sm text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
               {note.count > 1 && <span className="font-bold bg-slate-200 dark:bg-slate-700 px-1.5 rounded mr-2">{note.count}x</span>}
               {note.message} <span className="text-xs text-slate-500 block mt-1">{new Date(note.timestamp).toLocaleTimeString()}</span>
             </div>
          ))}
        </div>
        <Button variant="outline" className="m-4" onClick={() => dispatch({ type: 'CLEAR_NOTIFICATION_HISTORY' })}>Clear</Button>
      </div> */}
      

      {/* MAIN NAVBAR */}
      <header className="sticky top-0 z-50 w-full bg-blue-900 dark:bg-slate-950 border-b border-blue-800 dark:border-slate-800 shadow-sm text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleLogoClick}>
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-xl">S</div>
            <h1 className="text-xl font-bold hidden sm:block">SecureShop</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })} className="p-2 text-blue-100 hover:bg-blue-800 dark:hover:bg-slate-800 rounded-full">
              {state.isDarkMode ? <Icons.Sun className="w-5 h-5"/> : <Icons.Moon className="w-5 h-5"/>}
            </button>
            <button onClick={() => dispatch({ type: 'TOGGLE_NOTIFICATION_PANEL', payload: true })} className="relative p-2 text-blue-100 hover:bg-blue-800 dark:hover:bg-slate-800 rounded-full">
              <Icons.Bell className="w-5 h-5"/>
              {state.activeNotifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>}
            </button>
            <div className="relative p-2 cursor-pointer hover:bg-blue-800 dark:hover:bg-slate-800 rounded-full transition-colors" onClick={() => { handleCartClick() }}>
              <Icons.Cart className="w-6 h-6"/>
              {state.cart.length > 0 && <span className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">{state.cart.reduce((sum, item) => sum + item.qty, 0)}</span>}
            </div>
          </div>
        </div>
      </header>

      {/* DYNAMIC PROGRESS BAR */}
      <CheckoutProgress />

      {/* DYNAMIC VIEW ROUTER */}
      <div className="flex-grow">
        {state.currentView === 'catalog' && <LazyCatalog />}
        {state.currentView === 'cart' && <LazyCart />}
        {state.currentView === 'details' && <LazyDetails />}
        {state.currentView === 'payment' && <LazyPayment />}
        {state.currentView === 'status' && <LazyStatus />}
      </div>

      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center text-xs text-slate-500">
          <p>&copy; 2026 SecureShop. All rights reserved.</p>
          <button onClick={copyDiagnostics} className="hover:text-blue-600 transition-colors flex items-center gap-1">📋 Copy Diagnostics</button>
        </div>
      </footer>
    </div>
  );
};
