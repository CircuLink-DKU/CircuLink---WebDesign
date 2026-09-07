import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { apiClient, ApiError } from '../lib/api';

type Status = 'form' | 'submitting' | 'success' | 'error';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<Status>('form');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setStatus('error');
      setErrorMessage(lang === 'zh' ? '重置链接无效,缺少 token。' : 'Invalid reset link: missing token.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage(lang === 'zh' ? '密码至少 8 位。' : 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setErrorMessage(lang === 'zh' ? '两次输入的密码不一致。' : 'Passwords do not match.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');
    try {
      await apiClient.resetPassword(token, password);
      setStatus('success');
    } catch (error) {
      setStatus('form');
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : lang === 'zh' ? '重置失败,请稍后重试。' : 'Reset failed, please try again later.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-emerald-100 to-sky-50 flex flex-col">
      <div className="p-6">
        <button
          onClick={() => navigate('/')}
          className="text-3xl text-emerald-800"
          aria-label={lang === 'zh' ? '返回' : 'Back'}
        >
          ←
        </button>
      </div>

      <div className="flex-1 flex items-start justify-center pt-8">
        <div className="w-3/4 md:w-1/2 lg:w-1/3 bg-gradient-to-r from-emerald-100/60 via-emerald-50 to-sky-100/70 rounded-xl p-10 shadow-lg border border-emerald-200">
          {status === 'success' ? (
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold text-emerald-800">
                {lang === 'zh' ? '密码已重置' : 'Password reset'}
              </h2>
              <p className="text-emerald-700">
                {lang === 'zh' ? '你的密码已更新,请用新密码登录。' : 'Your password has been updated. Please sign in with your new password.'}
              </p>
              <button
                onClick={() => navigate('/')}
                className="mt-2 px-6 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
              >
                {lang === 'zh' ? '回到首页' : 'Back to home'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-2xl font-semibold text-emerald-800 text-center">
                {lang === 'zh' ? '重置密码' : 'Reset password'}
              </h2>
              <div>
                <label className="block text-sm font-medium text-emerald-800 mb-1">
                  {lang === 'zh' ? '新密码' : 'New password'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-emerald-200 focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-emerald-800 mb-1">
                  {lang === 'zh' ? '确认新密码' : 'Confirm new password'}
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-emerald-200 focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>
              {errorMessage && <p className="text-sm text-rose-600">{errorMessage}</p>}
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full px-6 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors disabled:opacity-60"
              >
                {status === 'submitting'
                  ? (lang === 'zh' ? '提交中…' : 'Submitting…')
                  : (lang === 'zh' ? '重置密码' : 'Reset password')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
