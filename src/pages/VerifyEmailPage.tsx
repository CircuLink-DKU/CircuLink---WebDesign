import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { apiClient, ApiError } from '../lib/api';

type Status = 'loading' | 'success' | 'error';

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setErrorMessage(lang === 'zh' ? '验证链接无效，缺少 token。' : 'Invalid verification link: missing token.');
      return;
    }

    apiClient
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((error) => {
        setStatus('error');
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : lang === 'zh' ? '验证失败，请稍后重试。' : 'Verification failed, please try again later.'
        );
      });
  }, [searchParams, lang]);

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
        <div className="w-3/4 md:w-1/2 lg:w-1/3 bg-gradient-to-r from-emerald-100/60 via-emerald-50 to-sky-100/70 rounded-xl p-12 shadow-lg border border-emerald-200">
          <div className="text-center space-y-4">
            {status === 'loading' && (
              <>
                <div className="mx-auto h-10 w-10 border-4 border-emerald-300 border-t-emerald-700 rounded-full animate-spin" />
                <h2 className="text-xl md:text-2xl font-semibold text-emerald-800">
                  {lang === 'zh' ? '正在验证你的邮箱…' : 'Verifying your email…'}
                </h2>
              </>
            )}

            {status === 'success' && (
              <>
                <h2 className="text-2xl md:text-3xl font-semibold text-emerald-800 drop-shadow">
                  {lang === 'zh' ? '邮箱验证成功！' : 'Email verified!'}
                </h2>
                <p className="text-emerald-700">
                  {lang === 'zh' ? '你的账号已完成验证，可以正常使用了。' : 'Your account is now verified and ready to use.'}
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="mt-4 px-6 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                >
                  {lang === 'zh' ? '回到首页' : 'Back to home'}
                </button>
              </>
            )}

            {status === 'error' && (
              <>
                <h2 className="text-2xl md:text-3xl font-semibold text-rose-700 drop-shadow">
                  {lang === 'zh' ? '验证失败' : 'Verification failed'}
                </h2>
                <p className="text-rose-600">{errorMessage}</p>
                <p className="text-emerald-700 text-sm">
                  {lang === 'zh'
                    ? '链接可能已过期或已被使用，可以重新登录后在个人资料页重新发送验证邮件。'
                    : 'The link may be expired or already used. Try signing in and resending the verification email from your profile.'}
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="mt-4 px-6 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                >
                  {lang === 'zh' ? '回到首页' : 'Back to home'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
