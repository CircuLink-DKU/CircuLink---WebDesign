import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Heart } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { apiClient, Item, ApiError } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const AIRecommendationPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [userQuery, setUserQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Item[]>([]);
  const [favoritedIds, setFavoritedIds] = useState<Record<string, boolean>>({});

  // Keyword-based assist over real inventory (the backend item search).
  const runSearch = useCallback(async (query?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.getItems({
        q: query?.trim() || undefined,
        pageSize: 6,
      });
      setResults(response.data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : lang === 'zh' ? '加载推荐失败' : 'Failed to load recommendations'
      );
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [lang]);

  // Seed the panel with recent listings on first load.
  useEffect(() => {
    runSearch();
  }, [runSearch]);

  const handleSendQuery = async () => {
    if (!userQuery.trim()) return;
    await runSearch(userQuery);
  };

  const handleFavorite = async (itemId: string) => {
    if (!isAuthenticated) {
      setError(lang === 'zh' ? '请先登录以收藏商品' : 'Please sign in to save items');
      return;
    }
    try {
      await apiClient.addFavorite(itemId);
      setFavoritedIds((prev) => ({ ...prev, [itemId]: true }));
    } catch (err) {
      // A 409 just means it's already in favorites — treat as success.
      if (err instanceof ApiError && err.status === 409) {
        setFavoritedIds((prev) => ({ ...prev, [itemId]: true }));
        return;
      }
      setError(err instanceof Error ? err.message : (lang === 'zh' ? '收藏失败' : 'Failed to save item'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-sky-50">
      {/* Header */}
      <div className="bg-white border-b border-emerald-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">{lang === 'zh' ? '返回' : 'Back'}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="inline-block bg-white rounded-2xl shadow-md px-8 py-4 border-2 border-emerald-200">
            <h1 className="text-2xl font-bold text-emerald-900">{t('tellUsYourNeeds')}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left: Query Input */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border-2 border-emerald-100">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {lang === 'zh' ? '告诉 Circulink 你的需求...' : 'Ask Circulink anything...'}
            </label>
            <textarea
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSendQuery();
                }
              }}
              placeholder={lang === 'zh' ? '例如:想找便宜的电子产品或书籍。' : "(e.g., I'm looking for cheap electronics or books.)"}
              className="w-full h-40 sm:h-64 p-4 border-2 border-emerald-200 rounded-lg resize-none focus:outline-none focus:border-emerald-500 text-gray-700 placeholder:text-gray-400"
            />
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                onClick={handleSendQuery}
                disabled={isLoading || !userQuery.trim()}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md text-sm sm:text-base"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    {lang === 'zh' ? '搜索中...' : 'Searching...'}
                  </>
                ) : (
                  <>
                    {t('send')}
                    <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Results Panel */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border-2 border-emerald-100">
            <h2 className="text-lg sm:text-xl font-bold text-emerald-900 mb-4 sm:mb-6 text-center">
              {lang === 'zh' ? '推荐结果' : 'Recommendations'}
            </h2>

            {error && <p className="mb-4 text-sm text-rose-600 text-center">{error}</p>}

            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
              </div>
            ) : results.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">
                {lang === 'zh' ? '暂无匹配的商品' : 'No matching items yet'}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 sm:gap-4">
                {results.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-xl p-4 border-2 border-emerald-200 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="w-full aspect-square rounded-lg mb-3 overflow-hidden bg-gray-100">
                      <img
                        src={item.images?.[0] || '/placeholder.svg'}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => handleFavorite(item.id)}
                        className="p-1.5 rounded-full hover:bg-white transition-colors"
                        aria-label={lang === 'zh' ? '收藏' : 'Save'}
                      >
                        <Heart
                          className={`h-4 w-4 ${favoritedIds[item.id] ? 'fill-red-500 text-red-500' : 'text-emerald-600'}`}
                        />
                      </button>
                    </div>

                    <div className="space-y-1 mb-3">
                      <div className="text-sm font-semibold text-gray-700 truncate">{item.title}</div>
                      <div className="text-sm font-bold text-emerald-800">${Number(item.price).toFixed(2)}</div>
                    </div>

                    <button
                      onClick={() => navigate(`/product/${item.id}`)}
                      className="w-full py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      {lang === 'zh' ? '查看商品' : 'View Item'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIRecommendationPage;
