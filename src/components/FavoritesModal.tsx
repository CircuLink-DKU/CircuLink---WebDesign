import React, { useState, useEffect, useCallback } from 'react';
import { X, Heart, Loader, AlertCircle, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient, Favorite } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FavoritesModal: React.FC<FavoritesModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getFavorites();
      setFavorites(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : (lang === 'zh' ? '加载收藏失败' : 'Failed to load favorites'));
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [lang, user]);

  useEffect(() => {
    if (isOpen && user) {
      loadFavorites();
    }
  }, [isOpen, user, loadFavorites]);

  const handleRemoveFavorite = async (favoriteId: string, itemId: string) => {
    try {
      await apiClient.removeFavorite(favoriteId);
      setFavorites(prev => prev.filter(fav => fav.itemId !== itemId));
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  const handleViewItem = (itemId: string) => {
    onClose();
    navigate(`/product/${itemId}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-6xl max-h-[90vh] overflow-y-auto w-full">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-2">
            <Heart className="h-6 w-6 text-red-500" />
            <h2 className="text-2xl font-bold text-gray-900">{lang === 'zh' ? '我的收藏' : 'My Favorites'}</h2>
            {favorites.length > 0 && (
              <span className="ml-2 text-sm text-gray-500">({favorites.length})</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-green-600" />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {!loading && !error && favorites.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <ShoppingBag className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">{lang === 'zh' ? '暂无收藏' : 'No favorites yet'}</h3>
              <p className="text-gray-500 text-sm mb-4">{lang === 'zh' ? '去逛逛并收藏你喜欢的商品吧！' : 'Start exploring and save your favorite items!'}</p>
              <button
                onClick={() => {
                  onClose();
                  navigate('/products');
                }}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                {lang === 'zh' ? '浏览商品' : 'Browse Products'}
              </button>
            </div>
          )}

          {!loading && !error && favorites.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((favorite) => {
                const item = favorite.item;
                if (!item) return null;

                // item.images is normally a string[]; tolerate a legacy JSON string too.
                const PLACEHOLDER = '/placeholder.svg';
                let imageUrl = PLACEHOLDER;
                const rawImages: unknown = item.images;
                if (Array.isArray(rawImages)) {
                  imageUrl = rawImages[0] || PLACEHOLDER;
                } else if (typeof rawImages === 'string' && rawImages) {
                  try {
                    const parsed = JSON.parse(rawImages);
                    imageUrl = Array.isArray(parsed) ? parsed[0] || PLACEHOLDER : rawImages;
                  } catch {
                    imageUrl = rawImages;
                  }
                }

                return (
                  <div
                    key={favorite.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div
                      className="aspect-square bg-gray-100 relative cursor-pointer"
                      onClick={() => handleViewItem(item.id)}
                    >
                      <img
                        src={imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <button
                          onClick={(e) => {
                            e.stopPropagation();
                          handleRemoveFavorite(favorite.id, item.id);
                        }}
                        className="absolute top-2 right-2 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                      >
                        <Heart className="h-4 w-4 text-red-500 fill-current" />
                      </button>
                    </div>

                    <div className="p-4">
                      <h3
                        className="font-medium text-gray-900 mb-1 line-clamp-2 cursor-pointer hover:text-green-600"
                        onClick={() => handleViewItem(item.id)}
                      >
                        {item.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-gray-900">
                          ${Number(item.price).toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-500">{item.condition}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FavoritesModal;
