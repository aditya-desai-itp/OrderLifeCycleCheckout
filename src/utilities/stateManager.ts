import { createContext } from 'react';
import { ORDER_STATES, VALID_TRANSITIONS, type Action, type AppState, type CartItem } from '../types/types';
import { generateCartChecksum, generateSecureToken } from './securityGenerate';
import { Logger } from './logger';
export const AppStateContext = createContext<AppState|undefined>(undefined);
export const AppDispatchContext = createContext<React.Dispatch<Action>|undefined>(undefined);

export const initialState: AppState = {
  products: [], 
  cart: [], 
  cartHash: '', 
  cartVersion: 0,
  orderState: ORDER_STATES.CART_READY,
  sharedPaymentActive: false,
  currentView: 'catalog', 
  checkoutDetails: { name: '', email: '', address: '', city: '', zip: '' },
  searchQuery: '', 
  selectedCategories: [], 
  sortOption: 'default', 
  isDarkMode: false,
  activeNotifications: [], 
  notificationHistory: [], 
  isNotificationPanelOpen: false,
  lastUpdateSource: 'local',
  idempotencyKey: null, 
  checkoutToken: null,
  isCheckoutLocked: false, 
  cartConflict: null, 
  isHydrated: false
};

export const appReducer = (state : AppState, action: Action) : AppState => {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    
    case 'TOGGLE_DARK_MODE': {
      return { ...state, isDarkMode: !state.isDarkMode, lastUpdateSource: 'local' };
    }
    case 'SET_UI_STATE': 
        return { ...state, ...action.payload };
    case 'SET_VIEW': {
      Logger.log('INFO', `Mapped to view: ${action.payload}`);
      return { ...state, currentView: action.payload };
    };
    case 'SET_SHARED_PAYMENT_ACTIVE':
      return { ...state, sharedPaymentActive: action.payload, lastUpdateSource: 'local' };

    case 'UPDATE_CHECKOUT_DETAILS': return { ...state, checkoutDetails: { ...state.checkoutDetails, ...action.payload } };
    
    case 'ADD_TO_CART': {
      const existing = state.cart.find(item => item.id === action.payload.id);
      let newCart : CartItem[];
      if (existing) {
        newCart = state.cart.map(item => item.id === action.payload.id ? { ...item, qty: item.qty + 1 } : item);
      } else {
        newCart = [...state.cart, { ...action.payload, qty: 1 }];
      }
      Logger.log('INFO', 'Item added to cart', { productId: action.payload.id, newCartSize: newCart.length });
      return { 
        ...state, 
        cart: newCart, 
        cartHash: generateCartChecksum(newCart),
        cartVersion: state.cartVersion + 1,
        orderState: ORDER_STATES.CART_READY ,
        lastUpdateSource: 'local'
      };
    }

    case 'UPDATE_CART_QTY': {
      
      const newCart = state.cart.map(item => item.id === action.payload.id ? { ...item, qty: action.payload.qty } : item).filter(item => item.qty > 0);
      const newView = (newCart.length === 0 && state.currentView !== 'catalog') ? 'catalog' : state.currentView;
      return { 
        ...state, 
        cart: newCart, 
        cartHash: generateCartChecksum(newCart),
        orderState: ORDER_STATES.CART_READY,
        cartVersion: state.cartVersion + 1,
        currentView: newView,
        lastUpdateSource: 'local'
      };
    }

    case 'CLEAR_CART': 
      Logger.log('INFO', 'Cart cleared completely.');
      return { ...state, 
        cart: [], cartHash: '',
        orderState: ORDER_STATES.CART_READY, 
        idempotencyKey: null, 
        currentView: action.payload ? action.payload : 'catalog', 
        checkoutDetails: initialState.checkoutDetails, 
        cartVersion: initialState.cartVersion,
        isCheckoutLocked: false,
      lastUpdateSource: 'local' };
    case 'ORDER_COMPLETE_CLEAR': {
      Logger.log('INFO', 'Cart cleared securely post-order success.');
      return { ...state, 
        cart: [], 
        cartHash: '',
        cartVersion: state.cartVersion + 1, 
        isCheckoutLocked: false,
        lastUpdateSource: 'local' };
    }
    case 'TRANSITION_STATE': {
      const nextState = action.payload;
      const allowed = VALID_TRANSITIONS[state.orderState]?.includes(nextState);
      
      if (!allowed) {
        Logger.log('ERROR', `Invalid State Machine Transition blocked: ${state.orderState} -> ${action.payload}`);
        console.error(`Invalid state transition from ${state.orderState} to ${nextState}`);
        return state; 
      }
      Logger.log('INFO', `State Machine Transition: ${state.orderState} -> ${action.payload}`);
      return { ...state, orderState: nextState, lastUpdateSource: 'local' };
    }

    case 'LOCK_CHECKOUT':
      return { ...state, isCheckoutLocked: action.payload };
    
    case 'GENERATE_CHECKOUT_TOKEN': {
      const token = generateSecureToken();
      Logger.log('SEC_AUDIT', 'Checkout Token generated', { token });
      return { ...state, checkoutToken: token };
    }
    case 'CONSUME_CHECKOUT_TOKEN': {
      Logger.log('SEC_AUDIT', 'Checkout Token consumed to prevent replay.');
      return { ...state, checkoutToken: null };
    }
    case 'SET_IDEMPOTENCY_KEY':{
      Logger.log('SEC_AUDIT', 'Idempotency Key set.');
      return { ...state, idempotencyKey: action.payload };
    }

    case 'ADD_NOTIFICATION': {
      const { message, type } = action.payload;
      const activeIdx = state.activeNotifications.findIndex(n => n.message === message && n.type === type);
      let newActive = [...state.activeNotifications];
      let newHistory = [...state.notificationHistory];

      // If identical notification exists, increment counter instead of spamming UI
      if (activeIdx > -1) {
        newActive[activeIdx] = { ...newActive[activeIdx], count: newActive[activeIdx].count + 1, timestamp: Date.now() };
        
        // Bring notif to top of history
        const histIdx = newHistory.findIndex(n => n.message === message && n.type === type);
        if (histIdx > -1) {
           newHistory[histIdx] = { ...newHistory[histIdx], count: newHistory[histIdx].count + 1, timestamp: Date.now() };
           const [item] = newHistory.splice(histIdx, 1);
           newHistory.unshift(item);
        }
      } else {
        newActive.push(action.payload);
        newHistory.unshift(action.payload);
      }
      return { ...state, activeNotifications: newActive, notificationHistory: newHistory };
    }
    case 'REMOVE_ACTIVE_NOTIFICATION': return { ...state, activeNotifications: state.activeNotifications.filter(n => n.id !== action.payload) };
    case 'TOGGLE_NOTIFICATION_PANEL': return { ...state, isNotificationPanelOpen: action.payload };
    case 'CLEAR_NOTIFICATION_HISTORY': return { ...state, notificationHistory: [] };
    
    case 'SIMULATE_TAMPERING': {
      // Modifies price without updating the hash (simulates devtools manipulation)
      if (state.cart.length === 0) return state;
      const tamperedCart = [...state.cart];
      tamperedCart[0] = { ...tamperedCart[0], price: 0.01 };
      Logger.log('WARN', 'Simulated DevTools array tampering executed (Hash bypassed).');
      return { ...state, cart: tamperedCart, cartVersion: state.cartVersion + 1, lastUpdateSource: 'local' };
    }

    case 'SET_CART_CONFLICT': return { ...state, cartConflict: action.payload };
    case 'RESOLVE_CART_CONFLICT': {
      const newCart = action.payload;
      const newView = (newCart.length === 0 && state.currentView !== 'catalog') ? 'catalog' : 'cart';
      Logger.log('SEC_AUDIT', 'Cart conflict resolved by user.', { action: newCart.length === 0 ? 'Discarded' : 'Restored' });
      return { ...state, 
        cartConflict: null, 
        cart: newCart, 
        cartHash: generateCartChecksum(newCart), 
        currentView: newView, 
        isCheckoutLocked: false,
        checkoutDetails: initialState.checkoutDetails,
        orderState: ORDER_STATES.CART_READY,
        idempotencyKey: null,
        checkoutToken: null,
        cartVersion: state.cartVersion + 1,
        lastUpdateSource: 'local'
      };
    };

    case 'SYNC_FROM_OTHER_TAB': {
      const inc = action.payload;
      if (inc.cartVersion as number < state.cartVersion) return state; 
      if (inc.cartVersion === state.cartVersion && inc.sharedPaymentActive === state.sharedPaymentActive && inc.isDarkMode === state.isDarkMode && inc.orderState === state.orderState) {
        return state; 
      }
      
      return {
        ...state,
        cart: inc.cart || state.cart,
        cartHash: inc.cartHash || state.cartHash,
        cartVersion: inc.cartVersion || state.cartVersion,
        orderState: inc.orderState || state.orderState,
        isDarkMode: inc.isDarkMode ?? state.isDarkMode,
        sharedPaymentActive: inc.sharedPaymentActive ?? state.sharedPaymentActive,
        lastUpdateSource: 'sync' 
      };
    }

    case 'HYDRATE_STATE':
        return { ...state, ...action.payload, isHydrated: true, lastUpdateSource: 'local' };

    default:
      return state;
  }
}