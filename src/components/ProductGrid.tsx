import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import { ApiError, apiClient, Favorite, Item } from '../lib/api';

interface ProductGridProps {
  products: Item[];
  onProductClick: (productId: string) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, onProductClick }) => {
  const { t, lang } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [favoritesSet, setFavoritesSet] = useState<Record<string, boolean>>({});
  const canViewSeller = user?.role === 'ADMIN';

  useEffect(() => {
    const loadFavorites = async () => {
      if (!user) return;
      try {
        const response = await apiClient.getFavorites();
        if (response.data) {
          const map: Record<string, boolean> = {};
          response.data.forEach((fav: Favorite) => {
            if (fav.itemId) map[fav.itemId] = true;
          });
          setFavoritesSet(map);
        }
      } catch (err) {
        console.error('Failed to load favorites:', err);
      }
    };

    loadFavorites();
  }, [user]);

  const toggleFavorite = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    if (!isAuthenticated || !user) return;

    try {
      const isFav = !!favoritesSet[productId];
      if (isFav) {
        await apiClient.removeFavoriteByItemId(productId);
        setFavoritesSet((s) => ({ ...s, [productId]: false }));
      } else {
        await apiClient.addFavorite(productId);
        setFavoritesSet((s) => ({ ...s, [productId]: true }));
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFavoritesSet((s) => ({ ...s, [productId]: true }));
        return;
      }
      console.error('Favorite toggle error', err);
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">{t('noProductsFound')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (
        <div
          key={product.id}
          onClick={() => onProductClick(product.id)}
          className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
        >
            <div className="aspect-square bg-gray-100 relative overflow-hidden">
            <img
              src={
                typeof product.images === 'string'
                  ? (() => {
                      try {
                        const parsed = JSON.parse(product.images);
                        return Array.isArray(parsed) ? parsed[0] : product.images;
                      } catch {
                        return product.images || '/placeholder.svg';
                      }
                    })()
                  : (product.images?.[0] || '/placeholder.svg')
              }
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
              <button
                onClick={(e) => toggleFavorite(e, product.id)}
                className={`absolute top-2 right-2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="favorite"
                disabled={!isAuthenticated}
              >
                <Star className={`h-4 w-4 ${favoritesSet[product.id] ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} />
              </button>

            <div className="absolute top-2 left-2">
              <span className="bg-white px-2 py-1 rounded text-xs font-medium text-gray-700">
                {t(`condition.${product.condition?.toString().toLowerCase().replace(/\s+/g,'_')}`) || product.condition}
              </span>
            </div>
          </div>

          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 group-hover:text-orange-600 transition-colors">
              {product.title}
            </h3>

            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-gray-900">
                ${product.price}
              </span>
            </div>

            {canViewSeller ? (
              <div className="text-xs text-gray-500">
                {t('soldBy')} {product.seller?.name || product.seller?.email || (lang === 'zh' ? '未知卖家' : 'Unknown seller')}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductGrid;
