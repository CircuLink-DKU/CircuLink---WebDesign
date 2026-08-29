import React, { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { apiClient, ApiError } from '../lib/api';

const ForgotPasswordPage: React.FC = () => {
  const { lang } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiClient.requestPasswordReset(email.trim());
      setSent(true);
    } catch (requestError) {
      setError(requestError instanceof ApiError
        ? requestError.message
        : lang === 'zh' ? '发送失败，请稍后重试。' : 'Unable to send the email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[70vh] bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4 py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-100 bg-white p-8 shadow-lg">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-900">
          <ArrowLeft className="h-4 w-4" />
          {lang === 'zh' ? '返回首页' : 'Back to home'}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{lang === 'zh' ? '找回密码' : 'Forgot password'}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {lang === 'zh' ? '输入注册邮箱，我们会发送一封有效期为 1 小时的重置邮件。' : 'Enter your email and we will send a reset link valid for one hour.'}
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">
            {lang === 'zh' ? '如果该邮箱已注册，重置链接已发送。请检查收件箱和垃圾邮件。' : 'If that email is registered, a reset link has been sent. Check your inbox and spam folder.'}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-gray-700">
                {lang === 'zh' ? '邮箱' : 'Email'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-emerald-500" placeholder="your.email@university.edu" />
              </div>
            </div>
            {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? (lang === 'zh' ? '发送中…' : 'Sending…') : (lang === 'zh' ? '发送重置邮件' : 'Send reset email')}
            </button>
          </form>
        )}
      </div>
    </main>
  );
};

export default ForgotPasswordPage;
