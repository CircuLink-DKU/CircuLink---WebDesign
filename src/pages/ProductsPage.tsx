import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader, AlertCircle, ShoppingBag } from 'lucide-react';
import Layout from '../components/Layout';
import ProductGrid from '../components/ProductGrid';
import { apiClient, Item } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

interface ListItemsParams {
  categoryId?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  status?: string;
  sort?: string;
  order?: string;
  page?: number;
  pageSize?: number;
}

interface ProductsPageProps {
  searchQuery?: string;
}

const ProductsPage: React.FC<ProductsPageProps> = ({ searchQuery: initialSearch }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { lang } = useLanguage();

  // State management
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [searchQuery, setSearchQuery] = useState(
    initialSearch || searchParams.get('q') || ''
  );
  const [minPrice, setMinPrice] = useState<number | null>(
    searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null
  );
  const [maxPrice, setMaxPrice] = useState<number | null>(
    searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null
  );
  const [condition, setCondition] = useState<string | null>(
    searchParams.get('condition') || null
  );
  const [sortBy, setSortBy] = useState<string>(
    searchParams.get('sort') || 'createdAt'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('order') as 'asc' | 'desc') || 'desc'
  );
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const pageSize = 12;

  // Keep the search term in sync when the header navigates to /products?q=...
  // (the component stays mounted, so the initial useState value alone is stale).
  useEffect(() => {
    const q = initialSearch ?? searchParams.get('q') ?? '';
    setSearchQuery((prev) => (prev === q ? prev : q));
    setPage(1);
  }, [initialSearch, searchParams]);

  // Fetch items from API
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: ListItemsParams = {
          page,
          pageSize,
          sort: sortBy,
          order: sortOrder,
        };

        if (searchQuery) params.q = searchQuery;
        if (minPrice !== null) params.minPrice = minPrice;
        if (maxPrice !== null) params.maxPrice = maxPrice;
        if (condition) params.condition = condition;

        const response = await apiClient.getItems(params);
        setItems(response.data || []);
        setTotalCount(response.meta?.total || 0);
        console.log('✅ Items loaded:', response.data?.length || 0);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : (lang === 'zh' ? '加载商品失败' : 'Failed to fetch items');
        setError(errorMessage);
        setItems([]);
        console.error('❌ Error fetching items:', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [condition, lang, maxPrice, minPrice, page, searchQuery, sortBy, sortOrder]);

  // Handle product click
  const handleProductClick = (id: string) => {
    navigate(`/product/${id}`);
  };

  return (
    <Layout>
      <div className="w-full min-h-screen bg-gradient-to-b from-[#7fb58a] via-[#a4c6a5] to-[#d3f0c7]">
        {/* Header with search info */}
        {searchQuery && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
            <p className="text-sm text-blue-800">
              {lang === 'zh'
                ? <>搜索结果: "<strong>{searchQuery}</strong>" ({totalCount} 件商品)</>
                : <>Search results: "<strong>{searchQuery}</strong>" ({totalCount} items)</>}
            </p>
          </div>
        )}

        {/* Filters and Controls */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'zh' ? '最低价格' : 'Min Price'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={minPrice ?? ''}
                  onChange={(e) => {
                    setMinPrice(e.target.value ? Number(e.target.value) : null);
                    setPage(1);
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'zh' ? '最高价格' : 'Max Price'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={maxPrice ?? ''}
                  onChange={(e) => {
                    setMaxPrice(e.target.value ? Number(e.target.value) : null);
                    setPage(1);
                  }}
                  placeholder="999999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'zh' ? '商品状况' : 'Condition'}
                </label>
                <select
                  value={condition || ''}
                  onChange={(e) => {
                    setCondition(e.target.value || null);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="">{lang === 'zh' ? '全部' : 'All'}</option>
                  <option value="NEW">{lang === 'zh' ? '全新' : 'New'}</option>
                  <option value="LIKE_NEW">{lang === 'zh' ? '几乎全新' : 'Like New'}</option>
                  <option value="GOOD">{lang === 'zh' ? '良好' : 'Good'}</option>
                  <option value="FAIR">{lang === 'zh' ? '一般' : 'Fair'}</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'zh' ? '排序方式' : 'Sort By'}
                </label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [sort, order] = e.target.value.split('-');
                    setSortBy(sort);
                    setSortOrder(order as 'asc' | 'desc');
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="createdAt-desc">{lang === 'zh' ? '最新上架' : 'Newest'}</option>
                  <option value="price-asc">{lang === 'zh' ? '价格: 低到高' : 'Price: Low to High'}</option>
                  <option value="price-desc">{lang === 'zh' ? '价格: 高到低' : 'Price: High to Low'}</option>
                </select>
              </div>

              {/* Reset Filters */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setMinPrice(null);
                    setMaxPrice(null);
                    setCondition(null);
                    setSortBy('createdAt');
                    setSortOrder('desc');
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  {lang === 'zh' ? '重置筛选' : 'Reset Filters'}
                </button>
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
          {!loading && items.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-12">
              <ShoppingBag className="h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-700">{lang === 'zh' ? '未找到商品' : 'No products found'}</h3>
              <p className="text-gray-500 mt-1 text-sm">
                {searchQuery
                  ? (lang === 'zh' ? `没有找到与"${searchQuery}"匹配的商品` : `No products matched "${searchQuery}"`)
                  : (lang === 'zh' ? '暂时没有可用商品' : 'No products available')}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  {lang === 'zh' ? '清除搜索' : 'Clear Search'}
                </button>
              )}
            </div>
          )}

          {/* Products Grid */}
          {!loading && items.length > 0 && (
            <>
              <ProductGrid products={items} onProductClick={handleProductClick} />

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
    </Layout>
  );
};

export default ProductsPage;
