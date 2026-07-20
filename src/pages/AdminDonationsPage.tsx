import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, RefreshCcw, ShieldAlert, User, Tag, Calendar } from 'lucide-react';
import { apiClient, Item } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';

const DONATION_PREFIX = '[DONATION]';
const AGREEMENT_SPLITTER = '\n\nDonation Agreement:';

const AdminDonationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { lang } = useLanguage();
  const canManageDonations = user?.role === 'ADMIN' || user?.role === 'CLUB_OPERATOR';
  const [donations, setDonations] = useState<Item[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiOrigin = useMemo(
    () => (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, ''),
    []
  );

  const resolveImageUrl = (url: string) => (url.startsWith('/uploads/') ? `${apiOrigin}${url}` : url);

  const getReadableDescription = (description: string) => {
    const strippedPrefix = description.startsWith(DONATION_PREFIX)
      ? description.slice(DONATION_PREFIX.length).trim()
      : description.trim();
    return strippedPrefix.split(AGREEMENT_SPLITTER)[0].trim();
  };

  const loadDonations = useCallback(async () => {
    try {
      setFetching(true);
      setError(null);
      const response = await apiClient.getDonations({ page: 1, pageSize: 100 });
      setDonations(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : (lang === 'zh' ? '加载捐赠列表失败' : 'Failed to load donations'));
    } finally {
      setFetching(false);
    }
  }, [lang]);

  useEffect(() => {
    if (!loading && canManageDonations) {
      loadDonations();
    } else if (!loading) {
      setFetching(false);
    }
  }, [loading, canManageDonations, loadDonations]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-sky-50 flex items-center justify-center">
        <Loader className="h-6 w-6 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!canManageDonations) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-sky-50 flex items-center justify-center px-6">
        <div className="max-w-xl w-full bg-white border border-emerald-200 rounded-2xl p-8 shadow-lg text-center">
          <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-emerald-900 mb-2">
            {lang === 'zh' ? '仅 Admin / club-operation 可访问' : 'Admin / club-operation only'}
          </h1>
          <p className="text-emerald-800 mb-6">
            {lang === 'zh' ? '该页面仅对 donation 运营角色开放。' : 'This page is available only to donation operations roles.'}
          </p>
          <button
            onClick={() => navigate('/donation')}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            {lang === 'zh' ? '返回捐赠页' : 'Back to Donation'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-sky-50 py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between mb-8">
          <div className="inline-block bg-emerald-50 border-2 border-emerald-200 rounded-full px-8 md:px-12 py-3 md:py-4 shadow-[0_8px_0_rgba(16,185,129,0.08)]">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-emerald-800">
              {lang === 'zh' ? 'Donation 管理面板' : 'Donation Admin Panel'}
            </h1>
          </div>
          <button
            onClick={loadDonations}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <RefreshCcw className="h-4 w-4" />
            {lang === 'zh' ? '刷新' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        {fetching ? (
          <div className="py-16 flex items-center justify-center text-emerald-700">
            <Loader className="h-6 w-6 animate-spin mr-2" />
            {lang === 'zh' ? '正在加载捐赠列表...' : 'Loading donations...'}
          </div>
        ) : donations.length === 0 ? (
          <div className="py-16 text-center text-emerald-800">
            {lang === 'zh' ? '暂无捐赠记录' : 'No donations yet'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {donations.map((donation) => (
              <article
                key={donation.id}
                className="bg-white/90 border border-emerald-200 rounded-2xl shadow-[8px_8px_0_rgba(16,185,129,0.06)] overflow-hidden"
              >
                <div className="w-full aspect-[4/3] bg-emerald-100">
                  {donation.images?.[0] ? (
                    <img
                      src={resolveImageUrl(donation.images[0])}
                      alt={donation.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-emerald-600">
                      {lang === 'zh' ? '无图片' : 'No Image'}
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="text-lg font-semibold text-emerald-900 mb-2 line-clamp-2">{donation.title}</h2>
                  <p className="text-sm text-emerald-800/90 mb-4 line-clamp-3">
                    {getReadableDescription(donation.description)}
                  </p>
                  <div className="space-y-2 text-sm text-emerald-800">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{donation.seller?.name || donation.seller?.email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <span>{donation.category?.name || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(donation.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDonationsPage;
