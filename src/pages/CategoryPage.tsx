import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader, AlertCircle, ShoppingBag } from 'lucide-react';
import { ApiError, apiClient, Category, Favorite, Item } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';

interface ListItemsParams {
  categoryId?: string;
  sort?: string;
  order?: string;
  page?: number;
  pageSize?: number;
}

const CategoryPage: React.FC = () => {
  const { categoryName } = useParams<{ categoryName: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { lang } = useLanguage();

  // State
  const [products, setProducts] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [favoritesSet, setFavoritesSet] = useState<Record<string, boolean>>({});
  const pageSize = 12;
  const normalizedCategoryName = (categoryName || '').toLowerCase();
  const isAllCategory = normalizedCategoryName === 'all';
  const matchedCategory = useMemo(
    () =>
      categories.find(
        (category) =>
          category.slug.toLowerCase() === normalizedCategoryName ||
          category.name.toLowerCase().replace(/\s+/g, '-') === normalizedCategoryName
      ),
    [categories, normalizedCategoryName]
  );

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await apiClient.getCategories();
        setCategories(response.data || []);
      } catch {
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!user) {
        setFavoritesSet({});
        return;
      }
      try {
        const response = await apiClient.getFavorites();
        const map: Record<string, boolean> = {};
        (response.data || []).forEach((fav: Favorite) => {
          if (fav.itemId) map[fav.itemId] = true;
        });
        setFavoritesSet(map);
      } catch {
        setFavoritesSet({});
      }
    };
    loadFavorites();
  }, [user]);

  // Fetch items for this category
  useEffect(() => {
    const fetchCategoryItems = async () => {
      if (!categoryName) return;
      if (!isAllCategory && categoriesLoading) return;
      if (!isAllCategory && !matchedCategory) {
        setProducts([]);
        setTotalCount(0);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const params: ListItemsParams = {
          ...(!isAllCategory && matchedCategory?.id ? { categoryId: matchedCategory.id } : {}),
          page,
          pageSize,
          sort: sortBy,
          order: sortOrder,
        };

        const response = await apiClient.getItems(params);
        setProducts(response.data || []);
        setTotalCount(response.meta?.total || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : (lang === 'zh' ? '加载商品失败' : 'Failed to fetch items'));
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryItems();
  }, [categoryName, categoriesLoading, matchedCategory, isAllCategory, lang, page, sortBy, sortOrder]);

  const handleNavigateBack = () => {
    navigate('/');
  };

  const handleToggleFavorite = async (event: React.MouseEvent, productId: string) => {
    event.stopPropagation();
    if (!isAuthenticated || !user) return;

    try {
      const isFav = Boolean(favoritesSet[productId]);
      if (isFav) {
        await apiClient.removeFavoriteByItemId(productId);
        setFavoritesSet((prev) => ({ ...prev, [productId]: false }));
      } else {
        await apiClient.addFavorite(productId);
        setFavoritesSet((prev) => ({ ...prev, [productId]: true }));
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFavoritesSet((prev) => ({ ...prev, [productId]: true }));
        return;
      }
      console.error('Failed to toggle favorite:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100">
      {/* Back Button and Title */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={handleNavigateBack}
          className="flex items-center text-gray-700 hover:text-gray-900 mb-6 transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="h-6 w-6 mr-2" />
          <span className="text-lg">{lang === 'zh' ? '返回' : 'Back'}</span>
        </button>

        {/* Category Header with Title and Filters */}
        <div className="bg-white rounded-3xl p-8 mb-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-green-800">
              {(isAllCategory ? (lang === 'zh' ? '全部商品' : 'All Products') : (matchedCategory?.name || categoryName || '')).toUpperCase()}
            </h1>
            <div className="flex gap-4">
              <div className="relative">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [sort, order] = e.target.value.split('-');
                    setSortBy(sort);
                    setSortOrder(order as 'asc' | 'desc');
                    setPage(1);
                  }}
                  className="appearance-none px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 cursor-pointer hover:border-gray-400 focus:outline-none focus:border-green-500"
                >
                  <option value="createdAt-desc">{lang === 'zh' ? '最新上架' : 'Newest'}</option>
                  <option value="price-asc">{lang === 'zh' ? '价格: 低到高' : 'Price: Low to High'}</option>
                  <option value="price-desc">{lang === 'zh' ? '价格: 高到低' : 'Price: High to Low'}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader className="h-8 w-8 text-green-600 animate-spin mb-3" />
            <p className="text-gray-600">{lang === 'zh' ? '加载中...' : 'Loading...'}</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">{lang === 'zh' ? '加载失败' : 'Load Failed'}</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && products.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-700">{lang === 'zh' ? '未找到商品' : 'No products found'}</h3>
            <p className="text-gray-500 mt-1 text-sm">{lang === 'zh' ? '该分类暂时没有可用商品' : 'No available products in this category yet'}</p>
            <button
              onClick={handleNavigateBack}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              {lang === 'zh' ? '返回首页' : 'Back to Home'}
            </button>
          </div>
        )}

        {/* Products Grid */}
        {!loading && products.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {/* Image Container */}
                  <div className="aspect-square bg-gray-100 relative overflow-hidden flex-shrink-0">
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
                    {/* Favorite Star */}
                    <button
                      onClick={(event) => handleToggleFavorite(event, product.id)}
                      disabled={!isAuthenticated}
                      className={`absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow ${
                        !isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <svg
                        className={`w-6 h-6 ${
                          favoritesSet[product.id] ? 'text-yellow-400 fill-current' : 'text-gray-400'
                        }`}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        fill={favoritesSet[product.id] ? 'currentColor' : 'none'}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="text-gray-900 font-medium text-sm truncate">{product.title}</h3>
                    <p className="text-gray-700 font-bold mt-2">${product.price}</p>
                    {product.condition && (
                      <p className="text-gray-500 text-xs mt-1">{product.condition}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-8 mb-8">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lang === 'zh' ? '上一页' : 'Prev'}
              </button>
              <span className="text-sm text-gray-600">
                {lang === 'zh' ? `第 ${page} 页，共 ${Math.ceil(totalCount / pageSize)} 页` : `Page ${page} of ${Math.ceil(totalCount / pageSize)}`}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(totalCount / pageSize)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lang === 'zh' ? '下一页' : 'Next'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
