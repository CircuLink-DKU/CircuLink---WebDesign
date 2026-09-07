import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, RefreshCcw, ShieldAlert, Search } from 'lucide-react';
import { apiClient, AdminUser, UserRole } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';

const ROLES: UserRole[] = ['USER', 'CLUB_OPERATOR', 'BUY42_PARTNER', 'ADMIN'];

const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { lang } = useLanguage();
  const isAdmin = user?.role === 'ADMIN';

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setFetching(true);
      setError(null);
      const response = await apiClient.getAdminUsers({
        q: query || undefined,
        role: roleFilter || undefined,
        page: 1,
        pageSize: 100,
      });
      setUsers(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : (lang === 'zh' ? '加载用户列表失败' : 'Failed to load users'));
    } finally {
      setFetching(false);
    }
  }, [query, roleFilter, lang]);

  useEffect(() => {
    if (!loading && isAdmin) {
      loadUsers();
    } else if (!loading) {
      setFetching(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAdmin]);

  const handleRoleChange = async (targetId: string, role: UserRole) => {
    try {
      setUpdatingId(targetId);
      setError(null);
      const response = await apiClient.updateAdminUserRole(targetId, role);
      setUsers((prev) => prev.map((u) => (u.id === targetId ? response.data : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : (lang === 'zh' ? '更新权限失败' : 'Failed to update role'));
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-sky-50 flex items-center justify-center">
        <Loader className="h-6 w-6 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-sky-50 flex items-center justify-center px-6">
        <div className="max-w-xl w-full bg-white border border-emerald-200 rounded-2xl p-8 shadow-lg text-center">
          <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-emerald-900 mb-2">
            {lang === 'zh' ? '仅 Admin 可访问' : 'Admin only'}
          </h1>
          <p className="text-emerald-800 mb-6">
            {lang === 'zh' ? '该页面仅对管理员开放。' : 'This page is available only to administrators.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            {lang === 'zh' ? '返回首页' : 'Back Home'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-sky-50 py-12">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="inline-block bg-emerald-50 border-2 border-emerald-200 rounded-full px-8 md:px-12 py-3 md:py-4 shadow-[0_8px_0_rgba(16,185,129,0.08)]">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-emerald-800">
              {lang === 'zh' ? '用户权限管理' : 'User Role Management'}
            </h1>
          </div>
          <button
            onClick={loadUsers}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <RefreshCcw className="h-4 w-4" />
            {lang === 'zh' ? '刷新' : 'Refresh'}
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
              placeholder={lang === 'zh' ? '按邮箱或姓名搜索' : 'Search by email or name'}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-emerald-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
            className="px-3 py-2 rounded-lg border border-emerald-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">{lang === 'zh' ? '全部角色' : 'All roles'}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={loadUsers}
            className="px-4 py-2 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition-colors"
          >
            {lang === 'zh' ? '搜索' : 'Search'}
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
            {lang === 'zh' ? '正在加载用户列表...' : 'Loading users...'}
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-emerald-800">
            {lang === 'zh' ? '暂无用户' : 'No users found'}
          </div>
        ) : (
          <div className="bg-white/90 border border-emerald-200 rounded-2xl shadow-[8px_8px_0_rgba(16,185,129,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-emerald-50 text-emerald-800 text-left">
                    <th className="px-4 py-3 font-semibold">{lang === 'zh' ? '姓名' : 'Name'}</th>
                    <th className="px-4 py-3 font-semibold">{lang === 'zh' ? '邮箱' : 'Email'}</th>
                    <th className="px-4 py-3 font-semibold">{lang === 'zh' ? '邮箱已验证' : 'Verified'}</th>
                    <th className="px-4 py-3 font-semibold">{lang === 'zh' ? '注册时间' : 'Joined'}</th>
                    <th className="px-4 py-3 font-semibold">{lang === 'zh' ? '角色' : 'Role'}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-emerald-100">
                      <td className="px-4 py-3 text-emerald-900">{u.name || '-'}</td>
                      <td className="px-4 py-3 text-emerald-900">{u.email}</td>
                      <td className="px-4 py-3">
                        {u.emailVerifiedAt ? (
                          <span className="text-emerald-600">{lang === 'zh' ? '是' : 'Yes'}</span>
                        ) : (
                          <span className="text-amber-600">{lang === 'zh' ? '否' : 'No'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-emerald-800">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          disabled={u.id === user?.id || updatingId === u.id}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="px-2 py-1.5 rounded-lg border border-emerald-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        {updatingId === u.id && (
                          <Loader className="inline-block h-4 w-4 animate-spin ml-2 text-emerald-600" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
