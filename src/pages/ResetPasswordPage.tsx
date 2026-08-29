import React, { useState } from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { apiClient, ApiError } from '../lib/api';

const ResetPasswordPage: React.FC = () => {
  const { lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError(lang === 'zh' ? '两次输入的密码不一致。' : 'The passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.resetPassword(token, password);
      setSuccess(true);
    } catch (requestError) {
      setError(requestError instanceof ApiError
        ? requestError.message
        : lang === 'zh' ? '重置失败，请重新申请链接。' : 'Reset failed. Please request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[70vh] bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4 py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-100 bg-white p-8 shadow-lg">
        {success ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">{lang === 'zh' ? '密码已更新' : 'Password updated'}</h1>
            <p className="mt-2 text-sm text-gray-600">{lang === 'zh' ? '现在可以使用新密码登录。' : 'You can now sign in with your new password.'}</p>
            <Link to="/" className="mt-6 inline-block rounded-lg bg-emerald-700 px-6 py-2.5 font-medium text-white hover:bg-emerald-800">
              {lang === 'zh' ? '返回首页' : 'Back to home'}
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900">{lang === 'zh' ? '设置新密码' : 'Set a new password'}</h1>
            <p className="mt-2 text-sm text-gray-600">{lang === 'zh' ? '新密码至少需要 8 个字符。' : 'Your new password must contain at least 8 characters.'}</p>
            {!token ? (
              <div className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-700" role="alert">
                {lang === 'zh' ? '链接无效：缺少重置凭证。请重新申请邮件。' : 'Invalid link: the reset token is missing. Please request a new email.'}
                <Link to="/forgot-password" className="mt-3 block font-medium underline">{lang === 'zh' ? '重新申请' : 'Request a new link'}</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {[{ id: 'new-password', label: lang === 'zh' ? '新密码' : 'New password', value: password, setter: setPassword }, { id: 'confirm-password', label: lang === 'zh' ? '确认新密码' : 'Confirm password', value: confirmation, setter: setConfirmation }].map((field) => (
                  <div key={field.id}>
                    <label htmlFor={field.id} className="mb-1 block text-sm font-medium text-gray-700">{field.label}</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input id={field.id} type="password" value={field.value} onChange={(event) => field.setter(event.target.value)} required minLength={8} autoComplete="new-password" className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </div>
                ))}
                {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
                <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? (lang === 'zh' ? '更新中…' : 'Updating…') : (lang === 'zh' ? '更新密码' : 'Update password')}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default ResetPasswordPage;
