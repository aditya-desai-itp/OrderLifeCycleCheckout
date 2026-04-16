import type { CartItem } from "../types/types";

export const generateCartChecksum = (cart : CartItem[]): string => {
  const payload = cart.map(item => `${item.id}-${item.qty}-${item.price}`).join('|');
  return btoa(payload); // Basic base64 encoding for simulation purposes
};

export const generateIdempotencyKey = ():string => {
  return 'idk_' + Math.random().toString(36).substring(2, 11) + Date.now();
};

export const generateSecureToken = (): string => {
  return 'tok_' + crypto.randomUUID?.() || ('tok_' + Math.random().toString(36).substring(2));
};

export const deterministicRandom = (seedStr: string): number => {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) hash = Math.imul(31, hash) + seedStr.charCodeAt(i) | 0;
  return (Math.abs(hash) % 50) + 10; // Stable random number between 10 and 60
};