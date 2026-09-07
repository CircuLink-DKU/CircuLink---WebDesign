import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader, AlertCircle, Heart, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { ApiError, apiClient, Item } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../context/LanguageContext";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { lang } = useLanguage();
  const canViewSeller = user?.role === 'ADMIN';

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadItem = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getItem(id);
        setItem(response.data as Item);
      } catch (err) {
        setError(err instanceof Error ? err.message : (lang === 'zh' ? "加载商品失败" : "Failed to load item"));
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [id, lang]);

  useEffect(() => {
    if (!id || !isAuthenticated) {
      setIsFavorited(false);
      setFavoriteId(null);
      return;
    }

    const loadFavoriteStatus = async () => {
      try {
        const response = await apiClient.getFavorites({ page: 1, pageSize: 200 });
        const existing = (response.data || []).find((favorite) => favorite.itemId === id);
        setIsFavorited(Boolean(existing));
        setFavoriteId(existing?.id ?? null);
      } catch {
        setIsFavorited(false);
        setFavoriteId(null);
      }
    };

    loadFavoriteStatus();
  }, [id, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>{error || (lang === 'zh' ? "未找到商品" : "Item not found")}</span>
        </div>
      </div>
    );
  }

  // Parse images
  let images: string[] = [];
  try {
    images = Array.isArray(item.images) ? item.images : [item.images];
  } catch {
    images = item.images || [];
  }

  const currentImage = images[currentImageIndex] || "/placeholder.svg";

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) return;

    try {
      if (favoriteId) {
        await apiClient.removeFavorite(favoriteId);
        setIsFavorited(false);
        setFavoriteId(null);
      } else {
        const response = await apiClient.addFavorite(item.id);
        setIsFavorited(true);
        setFavoriteId(response.data.id);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setIsFavorited(true);
        const response = await apiClient.getFavorites({ page: 1, pageSize: 200 });
        const existing = (response.data || []).find((favorite) => favorite.itemId === item.id);
        setFavoriteId(existing?.id ?? null);
        return;
      }
      console.error("Failed to toggle favorite:", err);
    }
  };

  const handleContact = () => {
    navigate(`/messages?sellerId=${item.seller.id}&itemId=${item.id}`);
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      setError(lang === 'zh' ? "请先登录后再下单" : "Please sign in before placing an order");
      return;
    }

    try {
      setBuying(true);
      setError(null);
      const response = await apiClient.createOrder({
        itemId: item.id,
        total: Number(item.price)
      });
      navigate(`/orders/${response.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : (lang === 'zh' ? "创建订单失败" : "Failed to create order"));
      console.error("Failed to create order:", err);
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-200 via-emerald-200 to-green-300">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 p-2 hover:bg-white hover:bg-opacity-50 rounded-full transition"
        >
          <ChevronLeft className="w-6 h-6 text-gray-800" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 max-w-5xl">
          {/* Image Section */}
          <div className="flex flex-col">
            {/* Main Image */}
            <div className="relative bg-white rounded-xl p-4 mb-4 aspect-square flex items-center justify-center overflow-hidden">
              <img
                src={currentImage}
                alt={item.title}
                className="w-full h-full object-cover rounded-lg"
              />

              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Image Indicators */}
            {images.length > 1 && (
              <div className="flex gap-2 justify-center">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition ${
                      index === currentImageIndex
                        ? "bg-gray-800 w-8"
                        : "bg-gray-400 hover:bg-gray-600"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="flex flex-col justify-between">
            <div>
              {/* Title */}
              <h1 className="text-4xl font-bold mb-4 text-gray-800">{item.title}</h1>

              {/* Price */}
              <p className="text-3xl font-bold text-gray-800 mb-6">
                ${parseFloat(item.price).toFixed(2)}
              </p>

              {canViewSeller ? (
                <div className="mb-6 bg-white bg-opacity-60 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">{lang === 'zh' ? '卖家' : 'Seller'}</p>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-semibold text-gray-800">{item.seller?.name || (lang === 'zh' ? '未知用户' : 'Unknown')}</p>
                      <p className="text-xs text-gray-600">{item.seller?.email || (lang === 'zh' ? '无邮箱' : 'No email')}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">{lang === 'zh' ? '描述' : 'Description'}</label>
                <div className="bg-green-100 bg-opacity-60 rounded-lg p-4 min-h-32 text-gray-700">
                  {item.description}
                </div>
              </div>

              {/* Item Details */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="bg-white bg-opacity-60 rounded-lg p-3">
                  <p className="text-gray-600">{lang === 'zh' ? '成色' : 'Condition'}</p>
                  <p className="font-semibold text-gray-800">{item.condition}</p>
                </div>
                <div className="bg-white bg-opacity-60 rounded-lg p-3">
                  <p className="text-gray-600">{lang === 'zh' ? '状态' : 'Status'}</p>
                  <p className="font-semibold text-gray-800">{item.status}</p>
                </div>
                <div className="bg-white bg-opacity-60 rounded-lg p-3">
                  <p className="text-gray-600">{lang === 'zh' ? '分类' : 'Category'}</p>
                  <p className="font-semibold text-gray-800">{item.category?.name || (lang === 'zh' ? "暂无" : "N/A")}</p>
                </div>
                <div className="bg-white bg-opacity-60 rounded-lg p-3">
                  <p className="text-gray-600">{lang === 'zh' ? '发布时间' : 'Posted'}</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={handleToggleFavorite}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full font-semibold transition ${
                    isFavorited
                      ? "bg-yellow-400 hover:bg-yellow-500 text-gray-800"
                      : "bg-green-200 hover:bg-green-300 text-gray-800"
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? "fill-current" : ""}`} />
                  {isFavorited ? (lang === 'zh' ? "已收藏" : "Favorited") : (lang === 'zh' ? "收藏" : "Favorite")}
                </button>
                <button
                  onClick={handleContact}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-green-300 hover:bg-green-400 text-gray-800 rounded-full font-semibold transition"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {lang === 'zh' ? '联系卖家' : 'Contact'}
                </button>
              </div>
              <button
                onClick={handleBuyNow}
                disabled={buying}
                className="w-full py-3 px-4 bg-green-400 hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed text-gray-800 rounded-full font-bold text-lg transition"
              >
                {buying ? (lang === 'zh' ? "处理中..." : "Processing...") : (lang === 'zh' ? "立即购买" : "BUY NOW")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
