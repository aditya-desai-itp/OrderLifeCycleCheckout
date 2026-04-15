import type { CartItem } from "../types/types";

export const generateCartChecksum = (cart : CartItem[]): string => {
  const payload = cart.map(item => `${item.id}-${item.qty}-${item.price}`).join('|');
  return btoa(payload); // Basic base64 encoding for simulation purposes
};

export const generateIdempotencyKey = ():string => {
  return 'idk_' + Math.random().toString(36).substring(2, 11) + Date.now();
};