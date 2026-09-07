import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useLanguage } from '../context/LanguageContext';

const NotFoundPage: React.FC = () => {
  const { lang } = useLanguage();
  return (
    <Layout>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-5xl font-black text-emerald-700">404</p>
        <h1 className="text-2xl font-bold text-gray-800">
          {lang === 'zh' ? '页面不存在' : 'Page not found'}
        </h1>
        <p className="max-w-md text-sm text-gray-500">
          {lang === 'zh'
            ? '你访问的页面不存在或已被移除。'
            : "The page you're looking for doesn't exist or has been moved."}
        </p>
        <Link
          to="/"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {lang === 'zh' ? '返回首页' : 'Back to home'}
        </Link>
      </div>
    </Layout>
  );
};

export default NotFoundPage;
