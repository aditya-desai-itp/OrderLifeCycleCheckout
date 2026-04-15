import { createContext } from 'react';
import { ORDER_STATES, VALID_TRANSITIONS, type Action, type AppState, type CartItem } from '../types/types';
import { generateCartChecksum } from './checksum';

export const AppStateContext = createContext<AppState|undefined>(undefined);
export const AppDispatchContext = createContext<React.Dispatch<Action>|undefined>(undefined);

export const initialState: AppState = {
  products: [], 
  cart: [], 
  cartHash: '', 
  orderState: ORDER_STATES.CART_READY,
  currentView: 'catalog', 
  checkoutDetails: { name: '', email: '', address: '', city: '', zip: '' },
  searchQuery: '', 
  selectedCategories: [], 
  sortOption: 'default', 
  isDarkMode: false,
  activeNotifications: [], 
  notificationHistory: [], 
  isNotificationPanelOpen: false,
  idempotencyKey: null, 
  isCheckoutLocked: false, 
  cartConflict: null, 
  isHydrated: false
};

export const appReducer = (state : AppState, action: Action) : AppState => {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    
    case 'TOGGLE_DARK_MODE': {
      return { ...state, isDarkMode: !state.isDarkMode };
    }
    case 'SET_UI_STATE': 
        return { ...state, ...action.payload };
    case 'SET_VIEW': return { ...state, currentView: action.payload };
    case 'UPDATE_CHECKOUT_DETAILS': return { ...state, checkoutDetails: { ...state.checkoutDetails, ...action.payload } };
    
    case 'ADD_TO_CART': {
      const existing = state.cart.find(item => item.id === action.payload.id);
      let newCart : CartItem[];
      if (existing) {
        newCart = state.cart.map(item => item.id === action.payload.id ? { ...item, qty: item.qty + 1 } : item);
      } else {
        newCart = [...state.cart, { ...action.payload, qty: 1 }];
      }
      return { 
        ...state, 
        cart: newCart, 
        cartHash: generateCartChecksum(newCart),
        orderState: ORDER_STATES.CART_READY 
      };
    }

    case 'UPDATE_CART_QTY': {
      
      const newCart = state.cart.map(item => item.id === action.payload.id ? { ...item, qty: action.payload.qty } : item).filter(item => item.qty > 0);
      // If cart empties during checkout, send back to catalog
      const newView = (newCart.length === 0 && state.currentView !== 'catalog') ? 'catalog' : state.currentView;
      return { 
        ...state, 
        cart: newCart, 
        cartHash: generateCartChecksum(newCart),
        orderState: ORDER_STATES.CART_READY,
        currentView: newView
      };
    }

    case 'CLEAR_CART': 
      return { ...state, 
        cart: [], cartHash: '',
        orderState: ORDER_STATES.CART_READY, 
        idempotencyKey: null, 
        currentView: 'catalog', 
        checkoutDetails: initialState.checkoutDetails, 
        isCheckoutLocked: false };
    case 'ORDER_COMPLETE_CLEAR': 
      return { ...state, cart: [], cartHash: '', isCheckoutLocked: false };
    case 'TRANSITION_STATE': {
      const nextState = action.payload;
      const allowed = VALID_TRANSITIONS[state.orderState]?.includes(nextState);
      
      if (!allowed) {
        console.error(`Invalid state transition from ${state.orderState} to ${nextState}`);
        return state; 
      }
      return { ...state, orderState: nextState };
    }

    case 'LOCK_CHECKOUT':
      return { ...state, isCheckoutLocked: action.payload };

    case 'SET_IDEMPOTENCY_KEY':
      return { ...state, idempotencyKey: action.payload };

    case 'ADD_NOTIFICATION': {
      const { message, type } = action.payload;
      const activeIdx = state.activeNotifications.findIndex(n => n.message === message && n.type === type);
      let newActive = [...state.activeNotifications];
      let newHistory = [...state.notificationHistory];

      // Smart Counting: If identical notification exists, increment counter instead of spamming UI
      if (activeIdx > -1) {
        newActive[activeIdx] = { ...newActive[activeIdx], count: newActive[activeIdx].count + 1, timestamp: Date.now() };
        
        // Bring to top of history as well
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
      // Modifies price WITHOUT updating the hash (simulates devtools manipulation)
      if (state.cart.length === 0) return state;
      const tamperedCart = [...state.cart];
      tamperedCart[0] = { ...tamperedCart[0], price: 0.01 }; // Hacker changed price to 1 cent!
      return { ...state, cart: tamperedCart };
    }

    case 'SET_CART_CONFLICT': return { ...state, cartConflict: action.payload };
    case 'RESOLVE_CART_CONFLICT': {
      const newCart = action.payload;
      const newView = (newCart.length === 0 && state.currentView !== 'catalog') ? 'catalog' : state.currentView;
      return { ...state, 
        cartConflict: null, 
        cart: newCart, 
        cartHash: generateCartChecksum(newCart), 
        currentView: newView, 
        isCheckoutLocked: false };
    };

    case 'HYDRATE_STATE':
        return { ...state, ...action.payload, isHydrated: true };

    default:
      return state;
  }
}