import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Package,
  Heart,
  ShoppingBag,
  LogOut,
  Mail,
  GraduationCap,
  Phone,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { signOut, updateProfile as updateBackendProfile } from '../lib/backend';
import { apiClient } from '../lib/api';
import type { Item } from '../lib/api';

interface Favorite {
  id: string;
  itemId: string;
  item: Item;
}

interface ProfileFieldProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  isEditing?: boolean;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
}

const pageBackgroundStyle = {
  background: 'linear-gradient(to bottom, #B7D9B2, #5BC4B0, #289E8C)'
};

const glassCardStyle = {
  background: 'rgba(255,255,255,0.28)',
  borderColor: 'rgba(255,255,255,0.58)',
  boxShadow: '0 24px 60px rgba(14,72,63,0.1)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)'
};

const glassSoftStyle = {
  background: 'rgba(255,255,255,0.24)',
  borderColor: 'rgba(255,255,255,0.48)',
  boxShadow: '0 16px 36px rgba(14,72,63,0.08)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)'
};

const glassInputClass = 'mt-2 w-full rounded-2xl border border-white/55 bg-white/74 px-4 py-3 text-[#173b2b] shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] placeholder:text-[#64806d] focus:border-[#f28b54] focus:outline-none';
const subtleButtonClass = 'inline-flex items-center justify-center gap-2 rounded-full border border-white/55 bg-white/42 px-5 py-2.5 text-sm font-semibold text-[#24533a] shadow-[0_14px_30px_rgba(14,72,63,0.08)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/58';
const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#1f6a3d] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(27,79,49,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#185532] disabled:cursor-not-allowed disabled:opacity-60';
const destructiveButtonClass = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#d95b52] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(160,57,49,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#bf473f]';

const getStatusBadgeClass = (status?: string) => {
  switch (status) {
    case 'ACTIVE':
    case 'AVAILABLE':
      return 'border border-[#8fb48d] bg-[#dff0d8] text-[#25583b]';
    case 'SOLD':
      return 'border border-gray-300 bg-gray-100 text-gray-700';
    default:
      return 'border border-[#d4c58f] bg-[#fff4cf] text-[#87671d]';
  }
};

const getStatusLabel = (status: string | undefined, lang: string) => {
  if (lang !== 'zh') return status || 'UNKNOWN';
  switch (status) {
    case 'ACTIVE':
      return '已发布';
    case 'PENDING_REVIEW':
      return '审核中';
    case 'REJECTED':
      return '未通过';
    case 'SOLD':
      return '已售出';
    case 'ARCHIVED':
      return '已归档';
    case 'HIDDEN':
      return '已隐藏';
    case 'DRAFT':
      return '草稿';
    default:
      return status || '未知';
  }
};

const getStatusHint = (status: string | undefined, lang: string) => {
  if (lang !== 'zh') {
    switch (status) {
      case 'PENDING_REVIEW':
        return 'This item is waiting for review and is not public yet.';
      case 'REJECTED':
        return 'This item was rejected. Archive it or submit a new listing.';
      case 'ACTIVE':
        return 'Approved content cannot be edited directly. Mark it sold/archive or submit a new listing.';
      default:
        return '';
    }
  }
  switch (status) {
    case 'PENDING_REVIEW':
      return '该商品正在审核中，暂不会公开显示。';
    case 'REJECTED':
      return '该商品未通过审核，请归档或重新发布新的 listing。';
    case 'ACTIVE':
      return '已审核通过的核心内容不能直接修改；可以标记售出、归档，或重新发布。';
    default:
      return '';
  }
};

const ProfileField: React.FC<ProfileFieldProps> = ({
  icon: Icon,
  label,
  value,
  hint,
  isEditing = false,
  onChange,
  placeholder,
  type = 'text',
}) => {
  return (
    <div className="rounded-[1.35rem] border p-4" style={glassSoftStyle}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-white/50 bg-white/44 text-orange-700 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#5d7768]">
            {label}
          </label>
          {isEditing && onChange ? (
            <input
              type={type}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              className={glassInputClass}
              placeholder={placeholder}
            />
          ) : (
            <p className="mt-2 break-words text-base font-medium text-[#173b2b]">{value}</p>
          )}
          {hint ? <p className="mt-2 text-xs text-[#6a8477]">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang } = useLanguage();
  const { profile, isAuthenticated, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'items' | 'favorites'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    university: '',
  });
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [myFavorites, setMyFavorites] = useState<Favorite[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const notice = (location.state as { notice?: string } | null)?.notice;

  useEffect(() => {
    if (profile) {
      setEditForm({
        name: profile.full_name || '',
        phone: profile.phone || '',
        university: profile.university || '',
      });
    }
  }, [profile]);

  const loadMyItems = useCallback(async () => {
    if (!profile) return;
    setItemsLoading(true);
    try {
      const statuses = ['ACTIVE', 'PENDING_REVIEW', 'REJECTED', 'SOLD', 'ARCHIVED'];
      const responses = await Promise.all(
        statuses.map((status) =>
          apiClient.getItems({
            sellerId: profile.id,
            status,
            page: 1,
            pageSize: 100,
          })
        )
      );
      const merged = responses
        .flatMap((response) => response.data || [])
        .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyItems(merged);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setItemsLoading(false);
    }
  }, [profile]);

  const loadMyFavorites = useCallback(async () => {
    setFavoritesLoading(true);
    try {
      const response = await apiClient.getFavorites();
      setMyFavorites(response.data);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setFavoritesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'items' && myItems.length === 0) {
      loadMyItems();
    } else if (activeTab === 'favorites' && myFavorites.length === 0) {
      loadMyFavorites();
    }
  }, [activeTab, loadMyFavorites, loadMyItems, myFavorites.length, myItems.length]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setEditForm({
        name: profile?.full_name || '',
        phone: profile?.phone || '',
        university: profile?.university || '',
      });
      setError(null);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!editForm.name.trim()) {
      setError(lang === 'zh' ? '姓名不能为空' : 'Name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await updateBackendProfile(profile!.id, {
        full_name: editForm.name,
        phone: editForm.phone,
        university: editForm.university,
      });
      await refreshProfile();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : (lang === 'zh' ? '更新资料失败' : 'Failed to update profile'));
    } finally {
      setLoading(false);
    }
  };

  const renderLoadingBlock = (message: string) => (
    <div className="rounded-[1.8rem] border p-10 text-center" style={glassCardStyle}>
      <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/50 border-b-[#1f6a3d]" />
      <p className="mt-4 text-[#476656]">{message}</p>
    </div>
  );

  const renderEmptyState = (
    icon: typeof Package,
    message: string,
    buttonLabel: string,
    onClick: () => void,
  ) => {
    const Icon = icon;
    return (
      <div className="rounded-[1.8rem] border p-10 text-center" style={glassCardStyle}>
        <Icon className="mx-auto mb-4 h-16 w-16 text-[#6f8d7c]" />
        <p className="mb-5 text-[#476656]">{message}</p>
        <button onClick={onClick} className={primaryButtonClass}>
          {buttonLabel}
        </button>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen overflow-hidden px-4 py-12 sm:px-6 lg:px-8" style={pageBackgroundStyle}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-6rem] top-16 h-72 w-72 rounded-full bg-white/16 blur-3xl" />
          <div className="absolute right-[-4rem] top-28 h-80 w-80 rounded-full bg-[#dff7ea]/28 blur-3xl" />
          <div className="absolute bottom-[-4rem] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#3bb9a2]/20 blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-[2rem] border p-8 text-center" style={glassCardStyle}>
            <h1 className="text-3xl font-bold text-[#173b2b]">{t('profile')}</h1>
            <p className="mb-6 mt-4 text-lg text-[#355c46]">
              {lang === 'zh' ? '请先登录后查看个人资料' : 'Please sign in to view your profile'}
            </p>
            <button onClick={() => navigate('/')} className={primaryButtonClass}>
              <ArrowLeft className="h-4 w-4" />
              {lang === 'zh' ? '返回首页' : 'Back to Home'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-12 sm:px-6 lg:px-8" style={pageBackgroundStyle}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-6rem] top-16 h-72 w-72 rounded-full bg-white/16 blur-3xl" />
        <div className="absolute right-[-4rem] top-28 h-80 w-80 rounded-full bg-[#dff7ea]/28 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#3bb9a2]/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl space-y-6">
        <button onClick={() => navigate('/')} className={`${subtleButtonClass} mb-6`}>
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </button>

        {notice ? (
          <div className="rounded-[1.4rem] border border-[#d4c58f] bg-[#fff4cf]/90 px-4 py-3 text-[#87671d] shadow-sm">
            {notice}
          </div>
        ) : null}

        <div className="rounded-[2rem] border p-6 sm:p-8" style={glassCardStyle}>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col items-center gap-5 text-center md:flex-row md:text-left">
              <img
                src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'User')}&background=F97316&color=fff&size=128`}
                alt={profile?.full_name}
                className="h-24 w-24 rounded-full border-4 border-white shadow-[0_16px_40px_rgba(14,72,63,0.16)] sm:h-28 sm:w-28"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6a8477]">
                  {lang === 'zh' ? '个人中心' : 'Profile Hub'}
                </p>
                <h1 className="mt-2 text-3xl font-bold text-[#173b2b] sm:text-4xl">{profile?.full_name}</h1>
                <p className="mt-2 text-[#476656]">{profile?.email}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-3 md:justify-start">
                  <span className="rounded-full border border-white/55 bg-white/30 px-4 py-2 text-sm font-medium text-[#355c46]">
                    {profile?.university || (lang === 'zh' ? '未设置学校' : 'No university set')}
                  </span>
                  <span className="rounded-full border border-white/55 bg-white/30 px-4 py-2 text-sm font-medium text-[#355c46]">
                    {profile?.phone || (lang === 'zh' ? '未填写手机号' : 'No phone added')}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-[1.1rem] border px-4 py-4" style={glassSoftStyle}>
                <p className="text-2xl font-bold text-[#173b2b]">{myItems.length}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6a8477]">
                  {lang === 'zh' ? '商品' : 'Items'}
                </p>
              </div>
              <div className="rounded-[1.1rem] border px-4 py-4" style={glassSoftStyle}>
                <p className="text-2xl font-bold text-[#173b2b]">{myFavorites.length}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6a8477]">
                  {lang === 'zh' ? '收藏' : 'Favorites'}
                </p>
              </div>
              <div className="rounded-[1.1rem] border px-4 py-4" style={glassSoftStyle}>
                <p className="text-2xl font-bold text-[#173b2b]">{isEditing ? '…' : '1'}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6a8477]">
                  {lang === 'zh' ? '资料' : 'Profile'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-[1.2rem] border p-2" style={glassSoftStyle}>
          {[
            { key: 'info', label: t('accountInfo'), icon: Edit2 },
            { key: 'items', label: t('myItems'), icon: Package },
            { key: 'favorites', label: t('myFavorites'), icon: Heart },
          ].map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key as 'info' | 'items' | 'favorites')}
                className={`flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition-all duration-200 sm:text-base ${
                  active
                    ? 'bg-white/72 text-orange-700 shadow-[0_10px_24px_rgba(14,72,63,0.08)]'
                    : 'text-[#28513b] hover:bg-white/28'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="rounded-[2rem] border p-6 sm:p-8" style={glassCardStyle}>
            {activeTab === 'info' && (
              <div className="space-y-6">
                {error ? (
                  <div className="rounded-[1.4rem] border border-red-200 bg-red-50/90 px-4 py-3 text-red-700 shadow-sm">
                    {error}
                  </div>
                ) : null}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#173b2b]">{t('accountInfo')}</h2>
                    <p className="mt-1 text-sm text-[#5a7864]">
                      {lang === 'zh' ? '更新你的基础资料与联系方式。' : 'Update your account details and contact information.'}
                    </p>
                  </div>
                  <button onClick={handleEditToggle} className={subtleButtonClass}>
                    {isEditing ? (
                      <>
                        <X className="h-4 w-4" />
                        {t('cancel')}
                      </>
                    ) : (
                      <>
                        <Edit2 className="h-4 w-4" />
                        {t('edit')}
                      </>
                    )}
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <ProfileField
                    icon={UserRound}
                    label={t('name')}
                    value={isEditing ? editForm.name : (profile?.full_name || t('notProvided'))}
                    isEditing={isEditing}
                    onChange={(value) => setEditForm({ ...editForm, name: value })}
                    placeholder={lang === 'zh' ? '请输入姓名' : 'Enter your name'}
                  />
                  <ProfileField
                    icon={Mail}
                    label={t('email')}
                    value={profile?.email || t('notProvided')}
                    hint={lang === 'zh' ? '邮箱不可修改' : 'Email cannot be changed'}
                  />
                  <ProfileField
                    icon={GraduationCap}
                    label={t('university')}
                    value={isEditing ? editForm.university : (profile?.university || t('notProvided'))}
                    isEditing={isEditing}
                    onChange={(value) => setEditForm({ ...editForm, university: value })}
                    placeholder={lang === 'zh' ? '请输入学校' : 'Enter your university'}
                  />
                  <ProfileField
                    icon={Phone}
                    label={t('phone')}
                    value={isEditing ? editForm.phone : (profile?.phone || t('notProvided'))}
                    isEditing={isEditing}
                    onChange={(value) => setEditForm({ ...editForm, phone: value })}
                    placeholder={lang === 'zh' ? '请输入手机号' : 'Enter your phone number'}
                    type="tel"
                  />
                </div>

                {isEditing ? (
                  <button onClick={handleSave} disabled={loading} className={`${primaryButtonClass} w-full`}>
                    <Save className="h-4 w-4" />
                    {loading ? t('saving') : t('saveChanges')}
                  </button>
                ) : null}

                <div className="border-t border-white/35 pt-6">
                  <h2 className="text-xl font-bold text-[#173b2b]">{t('quickActions')}</h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <button onClick={() => navigate('/orders')} className={`${subtleButtonClass} w-full justify-start px-5 py-4`}>
                      <ShoppingBag className="h-5 w-5" />
                      {t('myOrders')}
                    </button>
                    <button onClick={handleSignOut} className={`${destructiveButtonClass} w-full justify-start px-5 py-4`}>
                      <LogOut className="h-5 w-5" />
                      {t('signOut')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'items' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-[#173b2b]">{t('myItems')}</h2>
                  <p className="mt-1 text-sm text-[#5a7864]">
                    {lang === 'zh' ? '查看和管理你已经发布的商品。' : 'Review and manage the items you have listed.'}
                  </p>
                </div>

                {itemsLoading ? (
                  renderLoadingBlock(lang === 'zh' ? '正在加载商品...' : 'Loading items...')
                ) : myItems.length === 0 ? (
                  renderEmptyState(
                    Package,
                    lang === 'zh' ? '你还没有发布商品' : "You haven't listed any items yet",
                    t('listFirstItem'),
                    () => navigate('/sell')
                  )
                ) : (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {myItems.map((item) => (
                      <div
                        key={item.id}
                        className="group relative overflow-hidden rounded-[1.8rem] border transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(14,72,63,0.14)]"
                        style={glassSoftStyle}
                        onClick={() => navigate(`/product/${item.id}`)}
                      >
                        {item.status !== 'ACTIVE' && item.status !== 'HIDDEN' ? (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate('/sell', { state: { editItemId: item.id } });
                            }}
                            className="absolute right-3 top-3 z-10 rounded-full border border-white/60 bg-white/82 px-3 py-1 text-xs font-semibold text-[#28513b] shadow-sm transition-colors hover:bg-white"
                          >
                            {t('edit')}
                          </button>
                        ) : null}
                        <img
                          src={item.images?.[0] || 'https://via.placeholder.com/300x200?text=No+Image'}
                          alt={item.title}
                          className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                        <div className="p-4">
                          <h3 className="mb-2 line-clamp-2 font-semibold text-[#173b2b]">{item.title}</h3>
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-lg font-bold text-orange-600">${item.price}</p>
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(item.status)}`}>
                              {getStatusLabel(item.status, lang)}
                            </span>
                          </div>
                          {getStatusHint(item.status, lang) ? (
                            <p className="mt-3 rounded-xl border border-white/45 bg-white/42 px-3 py-2 text-xs text-[#476656]">
                              {getStatusHint(item.status, lang)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'favorites' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-[#173b2b]">{t('myFavorites')}</h2>
                  <p className="mt-1 text-sm text-[#5a7864]">
                    {lang === 'zh' ? '保留你感兴趣的商品，随时回来查看。' : 'Keep track of items you want to revisit later.'}
                  </p>
                </div>

                {favoritesLoading ? (
                  renderLoadingBlock(lang === 'zh' ? '正在加载收藏...' : 'Loading favorites...')
                ) : myFavorites.length === 0 ? (
                  renderEmptyState(
                    Heart,
                    lang === 'zh' ? '你还没有收藏商品' : "You haven't favorited any items yet",
                    t('browseFavorites'),
                    () => navigate('/products')
                  )
                ) : (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {myFavorites.map((favorite) => (
                      <div
                        key={favorite.id}
                        className="group overflow-hidden rounded-[1.8rem] border transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(14,72,63,0.14)]"
                        style={glassSoftStyle}
                        onClick={() => navigate(`/product/${favorite.item.id}`)}
                      >
                        <img
                          src={favorite.item.images?.[0] || 'https://via.placeholder.com/300x200?text=No+Image'}
                          alt={favorite.item.title}
                          className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                        <div className="p-4">
                          <h3 className="mb-2 line-clamp-2 font-semibold text-[#173b2b]">{favorite.item.title}</h3>
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-lg font-bold text-orange-600">${favorite.item.price}</p>
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(favorite.item.status)}`}>
                              {favorite.item.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
