import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const DonationThanksPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLanguage();
  const reviewStatus = (location.state as { reviewStatus?: string } | null)?.reviewStatus;
  const pending = reviewStatus === 'PENDING_REVIEW';

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
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-semibold text-emerald-800 drop-shadow">
              {pending
                ? (lang === 'zh' ? '捐赠已提交审核' : 'Donation Submitted for Review')
                : (lang === 'zh' ? '感谢你的捐赠！' : 'Thanks for your donation!')}
            </h2>
            <p className="mt-4 text-emerald-800">
              {pending
                ? (lang === 'zh' ? '审核通过前不会进入 donation 管理列表。' : 'It will not enter the donation workflow until approved.')
                : (lang === 'zh' ? '你的捐赠已进入后续处理流程。' : 'Your donation has entered the next handling step.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationThanksPage;
