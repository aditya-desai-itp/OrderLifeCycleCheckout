export const ORDER_STATES = {
  CART_READY: 'CART_READY',
  CHECKOUT_VALIDATED: 'CHECKOUT_VALIDATED',
  ORDER_SUBMITTED: 'ORDER_SUBMITTED',
  ORDER_SUCCESS: 'ORDER_SUCCESS',
  ORDER_FAILED: 'ORDER_FAILED',
  ORDER_INCONSISTENT: 'ORDER_INCONSISTENT',
  ROLLED_BACK: 'ROLLED_BACK'
};

export const VALID_TRANSITIONS : Record<OrderState, OrderState[]> = {
  [ORDER_STATES.CART_READY]: [ORDER_STATES.CHECKOUT_VALIDATED],
  [ORDER_STATES.CHECKOUT_VALIDATED]: [ORDER_STATES.ORDER_SUBMITTED, ORDER_STATES.CART_READY],
  [ORDER_STATES.ORDER_SUBMITTED]: [ORDER_STATES.ORDER_SUCCESS, ORDER_STATES.ORDER_FAILED, ORDER_STATES.ORDER_INCONSISTENT],
  [ORDER_STATES.ORDER_FAILED]: [ORDER_STATES.CART_READY, ORDER_STATES.ROLLED_BACK, ORDER_STATES.ORDER_SUBMITTED],
  [ORDER_STATES.ORDER_INCONSISTENT]: [ORDER_STATES.CART_READY, ORDER_STATES.ROLLED_BACK],
  [ORDER_STATES.ROLLED_BACK]: [ORDER_STATES.CART_READY],
  [ORDER_STATES.ORDER_SUCCESS]: [ORDER_STATES.CART_READY] // Reset
};

export type OrderState = typeof ORDER_STATES[keyof typeof ORDER_STATES];

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
}

export interface AppState {
  products: Product[];
  cart: CartItem[];
  cartHash: string;
  orderState: OrderState;
  notifications: NotificationMsg[];
  isDarkMode: boolean;
  idempotencyKey: string | null;
  isCheckoutLocked: boolean;
}

export type Action =
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'ADD_TO_CART'; payload: Product }
  | { type: 'UPDATE_CART_QTY'; payload: { id: string | number; qty: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TRANSITION_STATE'; payload: OrderState }
  | { type: 'LOCK_CHECKOUT'; payload: boolean }
  | { type: 'SET_IDEMPOTENCY_KEY'; payload: string }
  | { type: 'ADD_NOTIFICATION'; payload: NotificationMsg }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'SIMULATE_TAMPERING' }
  | { type: 'HYDRATE_STATE'; payload: Partial<AppState> };

export type SortOption = 'default' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';

