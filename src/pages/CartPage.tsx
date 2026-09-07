import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, Trash } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { apiClient, Favorite } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { lang } = useLanguage();
  const [cartItems, setCartItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    const loadCart = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getFavorites({ page: 1, pageSize: 100 });
        setCartItems(response.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : (lang === 'zh' ? '加载购物车失败' : 'Failed to load cart'));
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [isAuthenticated, lang]);

  const totalPrice = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.item.price || 0), 0),
    [cartItems]
  );

  const handleRemove = async (favoriteId: string) => {
    try {
      await apiClient.removeFavorite(favoriteId);
      setCartItems((prev) => prev.filter((entry) => entry.id !== favoriteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : (lang === 'zh' ? '移除商品失败' : 'Failed to remove item'));
    }
  };

  const handleBuy = async (favorite: Favorite) => {
    try {
      setBuyingId(favorite.id);
      await apiClient.createOrder({
        itemId: favorite.item.id,
        total: Number(favorite.item.price || 0)
      });
      await apiClient.removeFavorite(favorite.id);
      setCartItems((prev) => prev.filter((entry) => entry.id !== favorite.id));
      navigate('/orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : (lang === 'zh' ? '创建订单失败' : 'Failed to create order'));
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="min-h-screen py-8" style={{ background: 'linear-gradient(to bottom, #b4edc6, #bfe7e5)' }}>
      <div className="max-w-6xl mx-auto px-6">
        <button onClick={() => navigate('/')} className="mb-4 px-3 py-1 text-gray-700 hover:text-gray-900">← {lang === 'zh' ? '返回' : 'Back'}</button>

        <h2 className="text-2xl font-semibold text-gray-900 mb-1">{lang === 'zh' ? '购物车' : 'Shopping cart'}</h2>
        {!isAuthenticated ? (
          <p className="text-sm text-gray-600 mb-6">{lang === 'zh' ? '请先登录后查看购物车。' : 'Please sign in to view your cart.'}</p>
        ) : (
          <p className="text-sm text-gray-600 mb-6">
            {lang === 'zh'
              ? `购物车中有 ${cartItems.length} 件商品 • 合计 $${totalPrice.toFixed(2)}`
              : `You have ${cartItems.length} item(s) in your cart • Total $${totalPrice.toFixed(2)}`}
          </p>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-700">{lang === 'zh' ? '购物车加载中...' : 'Loading cart...'}</div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">{error}</div>
        ) : (
          <div className="space-y-6">
            {cartItems.map((favorite) => (
              <div key={favorite.id} className="relative rounded-lg bg-white/60 shadow-md p-6 border border-gray-100 flex items-center">
                <img
                  src={favorite.item.images?.[0] || '/placeholder.svg'}
                  alt={favorite.item.title}
                  className="w-28 h-20 object-cover rounded-md mr-6"
                />

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{favorite.item.title}</h3>
                  <p className="text-sm text-gray-600">{favorite.item.condition}</p>
                </div>

                <div className="text-right mr-6">
                  <div className="text-lg font-bold text-gray-900">${Number(favorite.item.price).toFixed(2)}</div>
                </div>

                <button
                  className="p-2 text-gray-600 hover:text-red-600"
                  aria-label="remove"
                  onClick={() => handleRemove(favorite.id)}
                >
                  <Trash className="h-5 w-5" />
                </button>

                <div className="absolute right-[-72px] top-1/2 transform -translate-y-1/2">
                  <button
                    className="bg-green-100 text-green-800 px-5 py-4 rounded-lg shadow-md hover:bg-green-200 disabled:opacity-50"
                    onClick={() => handleBuy(favorite)}
                    disabled={buyingId === favorite.id}
                  >
                    {buyingId === favorite.id ? <Loader className="h-4 w-4 animate-spin" /> : (lang === 'zh' ? '购买' : 'BUY')}
                  </button>
                </div>
              </div>
            ))}
            {isAuthenticated && cartItems.length === 0 && (
              <div className="text-center py-12 text-gray-700">{lang === 'zh' ? '你的购物车是空的。' : 'Your cart is empty.'}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
