import React from 'react';
import { Button } from './buttons';
import type { Product } from '../types/types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, onAddToCart }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <div className="h-48 bg-slate-50 dark:bg-slate-900 p-4 flex justify-center items-center">
        <img src={product.image} alt={product.title} className="h-full object-contain mix-blend-multiply dark:mix-blend-normal" loading="lazy" />
      </div>
      <div className="p-4 flex flex-col grow">
        <h3 className="font-semibold text-slate-900 dark:text-slate-50 line-clamp-2 mb-1">{product.title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 capitalize">{product.category}</p>
        <div className="mt-auto flex justify-between items-center">
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">${product.price.toFixed(2)}</span>
          <Button onClick={() => onAddToCart(product)} variant="accent" className="py-1 px-3 text-sm">
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
});