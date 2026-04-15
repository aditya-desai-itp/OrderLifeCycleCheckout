export const ORDER_STATES = {
  CART_READY: 'CART_READY',
  CHECKOUT_VALIDATED: 'CHECKOUT_VALIDATED',
  ORDER_SUBMITTED: 'ORDER_SUBMITTED',
  ORDER_SUCCESS: 'ORDER_SUCCESS',        // Payment success
  ORDER_SHIPPED: 'ORDER_SHIPPED',        // Transit simulation
  ORDER_IN_TRANSIT: 'ORDER_IN_TRANSIT',  // Transit simulation
  ORDER_DELIVERED: 'ORDER_DELIVERED',    // Transit simulation
  ORDER_FAILED: 'ORDER_FAILED',
  ORDER_INCONSISTENT: 'ORDER_INCONSISTENT',
  ROLLED_BACK: 'ROLLED_BACK'
} as const;

export const VALID_TRANSITIONS: Record<OrderState, OrderState[]> = {
  [ORDER_STATES.CART_READY]: [ORDER_STATES.CHECKOUT_VALIDATED],
  [ORDER_STATES.CHECKOUT_VALIDATED]: [ORDER_STATES.ORDER_SUBMITTED, ORDER_STATES.CART_READY],
  [ORDER_STATES.ORDER_SUBMITTED]: [ORDER_STATES.ORDER_SUCCESS, ORDER_STATES.ORDER_FAILED, ORDER_STATES.ORDER_INCONSISTENT],
  [ORDER_STATES.ORDER_SUCCESS]: [ORDER_STATES.ORDER_SHIPPED, ORDER_STATES.CART_READY, ORDER_STATES.ORDER_IN_TRANSIT, ORDER_STATES.ORDER_DELIVERED],
  [ORDER_STATES.ORDER_SHIPPED]: [ORDER_STATES.ORDER_IN_TRANSIT, ORDER_STATES.CART_READY],
  [ORDER_STATES.ORDER_IN_TRANSIT]: [ORDER_STATES.ORDER_DELIVERED, ORDER_STATES.CART_READY],
  [ORDER_STATES.ORDER_DELIVERED]: [ORDER_STATES.CART_READY],
  [ORDER_STATES.ORDER_FAILED]: [ORDER_STATES.CART_READY, ORDER_STATES.ROLLED_BACK, ORDER_STATES.ORDER_SUBMITTED],
  [ORDER_STATES.ORDER_INCONSISTENT]: [ORDER_STATES.CART_READY, ORDER_STATES.ROLLED_BACK],
  [ORDER_STATES.ROLLED_BACK]: [ORDER_STATES.CART_READY],
};

export type OrderState = typeof ORDER_STATES[keyof typeof ORDER_STATES];
export type ViewState = 'catalog' | 'cart' | 'details' | 'payment' | 'status';

export interface Product {
  id: string | number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
}

export interface CartItem extends Product {
  qty: number;
}

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface NotificationMsg {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  count: number;
}

export interface CheckoutDetails {
  name: string; 
  email: string; 
  address: string; 
  city: string; 
  zip: string;
}

export interface AppState {
  // Core Data
  products: Product[];
  cart: CartItem[];
  cartHash: string;
  orderState: OrderState;
  
  // Navigation & Form Data
  currentView: ViewState;
  checkoutDetails: CheckoutDetails;
  // UI & Filters (Fully hydrated now)
  searchQuery: string;
  selectedCategories: string[];
  sortOption: SortOption;
  isDarkMode: boolean;
  
  // System
  activeNotifications: NotificationMsg[];
  notificationHistory: NotificationMsg[];
  isNotificationPanelOpen: boolean;
  idempotencyKey: string | null;
  isCheckoutLocked: boolean;
  cartConflict: { items: CartItem[] } | null;
  isHydrated: boolean;
}

export type Action =
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'SET_UI_STATE'; payload: Partial<AppState> }
  | { type: 'SET_VIEW'; payload: ViewState }
  | { type: 'UPDATE_CHECKOUT_DETAILS'; payload: Partial<CheckoutDetails> }
  | { type: 'ADD_TO_CART'; payload: Product }
  | { type: 'UPDATE_CART_QTY'; payload: { id: string | number; qty: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'ORDER_COMPLETE_CLEAR' }
  | { type: 'TRANSITION_STATE'; payload: OrderState }
  | { type: 'LOCK_CHECKOUT'; payload: boolean }
  | { type: 'SET_IDEMPOTENCY_KEY'; payload: string }
  | { type: 'ADD_NOTIFICATION'; payload: NotificationMsg }
  | { type: 'REMOVE_ACTIVE_NOTIFICATION'; payload: string }
  | { type: 'TOGGLE_NOTIFICATION_PANEL'; payload: boolean }
  | { type: 'CLEAR_NOTIFICATION_HISTORY' }
  | { type: 'SIMULATE_TAMPERING' }
  | { type: 'SET_CART_CONFLICT'; payload: { items: CartItem[] } | null }
  | { type: 'RESOLVE_CART_CONFLICT'; payload: CartItem[] }
  | { type: 'HYDRATE_STATE'; payload: Partial<AppState> };

export type SortOption = 'default' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';

