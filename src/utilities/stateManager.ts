import { createContext } from 'react';
import { ORDER_STATES, VALID_TRANSITIONS, type Action, type AppState, type CartItem } from '../types/types';
import { generateCartChecksum } from './checksum';

export const AppStateContext = createContext<AppState|undefined>(undefined);
export const AppDispatchContext = createContext<React.Dispatch<Action>|undefined>(undefined);

export const initialState : AppState = {
  products: [],
  cart: [],
  cartHash: '',
  orderState: ORDER_STATES.CART_READY,
  notifications: [],
  isDarkMode : false,
  idempotencyKey: null,
  isCheckoutLocked: false,
};

export const appReducer = (state : AppState, action: Action) : AppState => {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    
    case 'TOGGLE_DARK_MODE': {
      document.documentElement.classList.toggle("dark");
      return { ...state, isDarkMode: !state.isDarkMode };
    }

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
      return { 
        ...state, 
        cart: newCart, 
        cartHash: generateCartChecksum(newCart),
        orderState: ORDER_STATES.CART_READY
      };
    }

    case 'CLEAR_CART':
      return { ...state, cart: [], cartHash: '', orderState: ORDER_STATES.CART_READY, idempotencyKey: null };

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
      // Deduplication Logic
      const isDuplicate = state.notifications.some(n => n.message === action.payload.message && n.type === action.payload.type);
      if (isDuplicate) return state;
      return { ...state, notifications: [...state.notifications, action.payload] };
    }

    case 'REMOVE_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) };

    case 'SIMULATE_TAMPERING': {
      // Modifies price WITHOUT updating the hash (simulates devtools manipulation)
      if (state.cart.length === 0) return state;
      const tamperedCart = [...state.cart];
      tamperedCart[0] = { ...tamperedCart[0], price: 0.01 }; // Hacker changed price to 1 cent!
      return { ...state, cart: tamperedCart };
    }

    case 'HYDRATE_STATE':
      return { ...state, ...action.payload };

    default:
      return state;
  }
}