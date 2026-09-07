import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import CategorySection from '../components/CategorySection';
import HomeHeroArt from '../components/HomeHeroArt';
import { apiClient, Item } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHomeItems = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getItems({ status: 'ACTIVE', page: 1, pageSize: 18 });
        setItems(response.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : (lang === 'zh' ? '加载精选商品失败' : 'Failed to load featured items'));
      } finally {
        setLoading(false);
      }
    };

    loadHomeItems();
  }, [lang]);

  const mapped = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        title: item.title,
        price: item.price,
        image: item.images?.[0] || '/placeholder.svg',
        condition: item.condition,
        seller: item.seller?.name || item.seller?.email || (lang === 'zh' ? '卖家' : 'Seller')
      })),
    [items, lang]
  );

  const sections = [
    { title: lang === 'zh' ? '精选商品' : 'Featured Items', products: mapped.slice(0, 6), viewAll: '/products' },
    { title: lang === 'zh' ? '最新上架' : 'Recently Added', products: mapped.slice(6, 12), viewAll: '/products?sort=createdAt&order=desc' },
    { title: lang === 'zh' ? '预算之选' : 'Budget Picks', products: mapped.slice(12, 18), viewAll: '/products?sort=price&order=asc' }
  ];

  return (
    <Layout>
      <div className="w-full min-h-screen bg-gradient-to-b from-[#76b880] via-[#a6d1a5] to-[#e2f4d8]">
        <section className="relative overflow-hidden px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-12 top-0 h-24 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-[#6bad75]/30 blur-3xl" />
            <div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-[#ebf8e1]/45 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(360px,560px)] lg:gap-16">
            <div className="max-w-2xl text-left">
              <h1
                className="text-5xl font-black uppercase tracking-[0.12em] text-[#173b2b] sm:text-6xl lg:text-[5.4rem] lg:leading-[0.95]"
                style={{ fontWeight: 950 }}
              >
                CIRCULINK
              </h1>
              <p className="mt-5 text-lg leading-8 text-[#28513b] sm:text-xl">
                {lang === 'zh'
                  ? '让校园里的闲置物品重新流动。买卖、交换、捐赠都集中在一个更轻快的绿色入口。'
                  : 'Keep useful things in motion across campus. Buy, sell, and donate through one greener, faster marketplace.'}
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                <button
                  onClick={() => navigate('/buy')}
                  className="rounded-full bg-[#1f6a3d] px-10 py-4 text-lg font-semibold text-white shadow-[0_16px_40px_rgba(27,79,49,0.28)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#185532]"
                >
                  {lang === 'zh' ? '开始购物' : 'Start Shopping'}
                </button>
                <button
                  onClick={() => navigate('/sell')}
                  className="rounded-full border-2 border-[#1f6a3d] bg-white/70 px-10 py-4 text-lg font-semibold text-[#1f6a3d] shadow-[0_12px_30px_rgba(31,106,61,0.14)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white"
                >
                  {lang === 'zh' ? '出售物品' : 'Sell Items'}
                </button>
              </div>

            </div>

            <div className="relative">
              <div className="absolute inset-6 rounded-[2.5rem] bg-[#5fa96e]/30 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2.2rem] border border-[#214d35]/10 bg-white/25 p-3 shadow-[0_34px_90px_rgba(23,59,43,0.22)] backdrop-blur-sm">
                <HomeHeroArt />
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="text-center py-16 text-green-900">{lang === 'zh' ? '正在加载精选商品...' : 'Loading featured items...'}</div>
        ) : error ? (
          <div className="text-center py-16 text-red-700">{error}</div>
        ) : (
          sections
            .filter((section) => section.products.length > 0)
            .map((section) => (
              <CategorySection
                key={section.title}
                title={section.title}
                products={section.products}
                onViewAll={() => navigate(section.viewAll)}
              />
            ))
        )}

        {/* Footer CTA */}
        <section className="w-full py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-green-900 mb-4">
              {lang === 'zh' ? '加入可持续校园社区' : 'Join Our Sustainable Community'}
              </h2>
              <p className="text-lg text-green-800 mb-8">
              {lang === 'zh' ? '通过买卖与捐赠减少浪费，共建循环经济' : 'Buy, sell, and donate items to reduce waste and support circular economy'}
              </p>
            <button
              onClick={() => navigate('/about')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-full transition-colors shadow-md hover:shadow-lg"
            >
              {lang === 'zh' ? '了解更多' : 'Learn More About Us'}
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default HomePage;
