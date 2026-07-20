import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

interface ItemData {
  title: string;
  description: string;
  currentPrice: number;
  minimumAcceptablePrice?: number;
  images: string[];
  condition: string;
  categoryId: string;
  categoryName?: string;
  autoPriceReduce?: boolean;
  autoDonation?: boolean;
}

const SellReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLanguage();
  const itemData = (location.state as { draft?: ItemData } | null)?.draft;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');
  const resolveImageUrl = (url: string) => (url.startsWith('/uploads/') ? `${apiOrigin}${url}` : url);

  if (!itemData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#8fc594] via-[#c5e3bd] to-[#ecf8e6] py-12">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-lg text-emerald-900 mb-4">
            {lang === 'zh' ? '未找到草稿数据，请先填写发布表单。' : 'No draft data found. Please fill the sell form first.'}
          </p>
          <button
            onClick={() => navigate('/sell')}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            {lang === 'zh' ? '返回发布页' : 'Back to Sell Form'}
          </button>
        </div>
      </div>
    );
  }

  const reducedPriceAfter7Days = itemData.autoPriceReduce
    ? Math.max(
      itemData.currentPrice * 0.9,
      itemData.minimumAcceptablePrice ?? 0
    )
    : null;

  const handleAccept = async () => {
    if (!itemData) return;
    if (!itemData.categoryId) {
      setError(lang === 'zh' ? '分类不能为空，请返回上一页选择分类。' : 'Category is required. Please go back and choose a category.');
      return;
    }
    const hasBase64Image = itemData.images.some((image) => image.startsWith('data:image/'));
    if (hasBase64Image) {
      setError(lang === 'zh' ? '检测到本地预览图片，请返回发布页重新上传后再发布。' : 'Detected local preview images. Please go back to Sell page and re-upload images before publishing.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const response = await apiClient.createItem({
        title: itemData.title,
        description: itemData.description,
        price: itemData.currentPrice,
        condition: itemData.condition,
        status: 'ACTIVE',
        categoryId: itemData.categoryId,
        images: itemData.images
      });
      if (response.data.status === 'PENDING_REVIEW') {
        navigate('/profile', {
          state: {
            notice: lang === 'zh'
              ? '你的商品已提交审核，审核通过前不会公开显示。'
              : 'Your item is pending review and will not be public until approved.'
          }
        });
      } else {
        navigate(`/product/${response.data.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (lang === 'zh' ? '发布商品失败' : 'Failed to publish item'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevise = () => {
    navigate('/sell', { state: { draft: itemData } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8fc594] via-[#c5e3bd] to-[#ecf8e6] py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-block bg-emerald-50 border-2 border-emerald-200 rounded-full px-8 md:px-12 py-3 md:py-4 shadow-[0_8px_0_rgba(16,185,129,0.08)]">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-emerald-800">{lang === 'zh' ? '发布商品' : 'Sell Your Item'}</h1>
          </div>
        </div>

        {/* Basic Information Section */}
        <div className="mb-6">
          <div className="inline-block bg-emerald-100/60 rounded-full px-6 md:px-8 py-2 md:py-3 text-sm md:text-base shadow-inner text-emerald-800">
            {lang === 'zh' ? '基本信息' : 'Basic Information'}
          </div>
        </div>

        {/* Review Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-8">
          {/* Image */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg overflow-hidden">
              {itemData.images[0] && (
                <img
                  src={resolveImageUrl(itemData.images[0])}
                  alt={itemData.title}
                  className="w-full h-64 md:h-72 object-cover rounded-xl"
                />
              )}
            </div>
          </div>

          {/* Details Card */}
          <div className="md:col-span-2">
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 md:p-8 shadow-[8px_8px_0_rgba(16,185,129,0.06)]">
              {/* Title */}
              <h2 className="text-lg md:text-xl font-semibold text-emerald-900 mb-3">
                {itemData.title}
              </h2>

              {/* Description */}
              <p className="text-sm md:text-base text-emerald-800 mb-6 leading-relaxed">
                {itemData.description}
              </p>

              {/* Hashtags */}
              <div className="mb-6 space-y-2">
                <p className="text-emerald-700 text-sm">#LaptopStand</p>
                <p className="text-emerald-700 text-sm">#Ergonomic</p>
                <p className="text-emerald-700 text-sm">#DeskSetup</p>
                <p className="text-emerald-700 text-sm">#StudyEssential</p>
              </div>

              {/* Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-white rounded-lg p-4">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">{lang === 'zh' ? '价格' : 'Price'}</p>
                  <p className="text-lg md:text-xl font-bold text-emerald-700">
                    ￥{itemData.currentPrice.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600">{lang === 'zh' ? '成色' : 'Condition'}</p>
                  <p className="text-lg md:text-xl font-bold text-emerald-700">
                    {itemData.condition}
                  </p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600">{lang === 'zh' ? '分类' : 'Category'}</p>
                  <p className="text-lg md:text-xl font-bold text-emerald-700">
                    {itemData.categoryName || itemData.categoryId}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-1 mb-6 text-sm text-emerald-800">
                {itemData.minimumAcceptablePrice !== undefined && <p>{lang === 'zh' ? `最低可接受价格：￥${itemData.minimumAcceptablePrice.toFixed(2)}` : `Minimum acceptable price: ￥${itemData.minimumAcceptablePrice.toFixed(2)}`}</p>}
                <p>{lang === 'zh' ? '7天后自动降价：' : 'Auto reduce after 7 days: '}{itemData.autoPriceReduce ? (lang === 'zh' ? '是' : 'Yes') : (lang === 'zh' ? '否' : 'No')}</p>
                {reducedPriceAfter7Days !== null && (
                  <p>{lang === 'zh' ? `7天后价格（含最低价保护）：￥${reducedPriceAfter7Days.toFixed(2)}` : `Price after 7 days (with floor): ￥${reducedPriceAfter7Days.toFixed(2)}`}</p>
                )}
                <p>{lang === 'zh' ? '30天后自动捐赠：' : 'Auto donation after 30 days: '}{itemData.autoDonation ? (lang === 'zh' ? '是' : 'Yes') : (lang === 'zh' ? '否' : 'No')}</p>
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={handleAccept}
                  disabled={submitting}
                  className="flex-1 px-6 py-2 md:py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-full transition-colors shadow-md text-sm md:text-base"
                >
                  {submitting ? <span className="inline-flex items-center gap-2"><Loader className="h-4 w-4 animate-spin" />{lang === 'zh' ? '发布中...' : 'Publishing...'}</span> : (lang === 'zh' ? '确认发布' : 'Accept')}
                </button>
                <button
                  onClick={handleRevise}
                  className="flex-1 px-6 py-2 md:py-3 bg-emerald-400 hover:bg-emerald-500 text-white font-medium rounded-full transition-colors shadow-md text-sm md:text-base"
                >
                  {lang === 'zh' ? '返回修改' : 'Revise'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellReviewPage;
