import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArchiveX,
  CheckCircle2,
  Clock,
  Loader,
  RefreshCcw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { apiClient, ReviewQueueEntry } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';

const statusOptions = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES', 'HIDDEN'];
const targetTypeOptions = ['ITEM', 'DONATION'];
const reasonCodeOptions = [
  'missing_images',
  'external_payment',
  'high_value',
  'sensitive_category',
  'unsafe_or_prohibited',
  'inaccurate_description',
  'duplicate_submission',
  'policy_violation',
  'other',
];

const statusClass = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return 'border-emerald-300 bg-emerald-50 text-emerald-800';
    case 'REJECTED':
      return 'border-red-300 bg-red-50 text-red-700';
    case 'NEEDS_CHANGES':
      return 'border-sky-300 bg-sky-50 text-sky-800';
    case 'HIDDEN':
      return 'border-gray-300 bg-gray-100 text-gray-700';
    default:
      return 'border-amber-300 bg-amber-50 text-amber-800';
  }
};

const riskClass = (risk: string) => {
  switch (risk) {
    case 'HIGH':
      return 'border-red-300 bg-red-50 text-red-700';
    case 'MEDIUM':
      return 'border-amber-300 bg-amber-50 text-amber-800';
    default:
      return 'border-emerald-300 bg-emerald-50 text-emerald-800';
  }
};

const labels = {
  zh: {
    title: '审核队列',
    subtitle: '处理被规则标记的新交易和 donation。',
    refresh: '刷新',
    pending: '待审核',
    allTypes: '全部类型',
    loading: '正在加载审核队列...',
    empty: '暂无审核项',
    adminOnly: '仅 Admin / club-operation 可访问',
    adminOnlyText: '该页面用于审核被系统规则标记的内容。',
    back: '返回首页',
    submitter: '提交者',
    target: '对象',
    reason: '原因码',
    comment: '审核备注',
    approve: '通过',
    reject: '拒绝',
    requestChanges: '要求修改',
    hide: '隐藏',
    deciding: '处理中...',
    flags: '触发规则',
    summary: '摘要',
    reviewedBy: '审核人',
    reviewedAt: '审核时间',
    reasonPlaceholder: '选择原因码',
    commentPlaceholder: '写给运营记录的简短说明',
    decisionRequired: '拒绝、要求修改或隐藏时请选择原因码',
  },
  en: {
    title: 'Review Queue',
    subtitle: 'Handle rule-flagged listings and donations.',
    refresh: 'Refresh',
    pending: 'Pending',
    allTypes: 'All types',
    loading: 'Loading review queue...',
    empty: 'No review items',
    adminOnly: 'Admin / club-operation only',
    adminOnlyText: 'This page is for reviewing content flagged by system rules.',
    back: 'Back home',
    submitter: 'Submitter',
    target: 'Target',
    reason: 'Reason code',
    comment: 'Review note',
    approve: 'Approve',
    reject: 'Reject',
    requestChanges: 'Request changes',
    hide: 'Hide',
    deciding: 'Working...',
    flags: 'Flags',
    summary: 'Summary',
    reviewedBy: 'Reviewed by',
    reviewedAt: 'Reviewed at',
    reasonPlaceholder: 'Select a reason code',
    commentPlaceholder: 'Short note for the operations record',
    decisionRequired: 'Reason code is required when rejecting, requesting changes, or hiding',
  },
};

const AdminReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { lang } = useLanguage();
  const text = labels[lang === 'zh' ? 'zh' : 'en'];
  const canReview = user?.role === 'ADMIN' || user?.role === 'CLUB_OPERATOR';
  const [reviews, setReviews] = useState<ReviewQueueEntry[]>([]);
  const [status, setStatus] = useState('PENDING');
  const [targetType, setTargetType] = useState('');
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [reasonCode, setReasonCode] = useState('');
  const [comment, setComment] = useState('');

  const visibleTargetTypes = useMemo(() => {
    if (user?.role === 'CLUB_OPERATOR') return ['DONATION'];
    return targetTypeOptions;
  }, [user?.role]);

  const loadReviews = useCallback(async () => {
    if (!canReview) return;
    try {
      setFetching(true);
      setError(null);
      const response = await apiClient.getReviews({
        status,
        targetType: targetType || undefined,
        page: 1,
        pageSize: 100,
      });
      setReviews(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setFetching(false);
    }
  }, [canReview, status, targetType]);

  useEffect(() => {
    if (!loading && canReview) {
      loadReviews();
    } else if (!loading) {
      setFetching(false);
    }
  }, [loading, canReview, loadReviews]);

  useEffect(() => {
    if (user?.role === 'CLUB_OPERATOR') {
      setTargetType('DONATION');
    }
  }, [user?.role]);

  const decide = async (review: ReviewQueueEntry, decision: 'approve' | 'reject' | 'requestChanges' | 'hide') => {
    if (decision !== 'approve' && !reasonCode.trim()) {
      setError(text.decisionRequired);
      return;
    }

    try {
      setActiveReviewId(review.id);
      setError(null);
      const payload = {
        reasonCode: reasonCode.trim() || undefined,
        comment: comment.trim() || undefined,
      };
      if (decision === 'approve') {
        await apiClient.approveReview(review.id, payload);
      } else if (decision === 'reject') {
        await apiClient.rejectReview(review.id, payload);
      } else if (decision === 'requestChanges') {
        await apiClient.requestReviewChanges(review.id, payload);
      } else {
        await apiClient.hideReview(review.id, payload);
      }
      setReasonCode('');
      setComment('');
      await loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decide review');
    } finally {
      setActiveReviewId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#d8edd2]">
        <Loader className="h-6 w-6 animate-spin text-[#28513b]" />
      </div>
    );
  }

  if (!canReview) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#d8edd2] px-6">
        <div className="w-full max-w-xl rounded-lg border border-[#9cc69e] bg-white/80 p-8 text-center shadow-lg">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-amber-600" />
          <h1 className="mb-2 text-2xl font-bold text-[#204932]">{text.adminOnly}</h1>
          <p className="mb-6 text-[#315842]">{text.adminOnlyText}</p>
          <button
            onClick={() => navigate('/')}
            className="rounded-md bg-[#28513b] px-5 py-2.5 font-semibold text-white hover:bg-[#1f3f2f]"
          >
            {text.back}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8fc594] via-[#c5e3bd] to-[#ecf8e6] px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-md border border-[#9cc69e] bg-white/55 px-3 py-1 text-sm font-semibold text-[#28513b]">
              <ShieldAlert className="h-4 w-4" />
              {user?.role === 'CLUB_OPERATOR' ? 'club-operation' : 'Admin'}
            </p>
            <h1 className="text-3xl font-bold text-[#204932]">{text.title}</h1>
            <p className="mt-2 text-[#315842]">{text.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 rounded-md border border-[#9cc69e] bg-white/85 px-3 text-[#204932]"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select
              value={targetType}
              onChange={(event) => setTargetType(event.target.value)}
              disabled={user?.role === 'CLUB_OPERATOR'}
              className="h-11 rounded-md border border-[#9cc69e] bg-white/85 px-3 text-[#204932] disabled:opacity-70"
            >
              {user?.role !== 'CLUB_OPERATOR' && <option value="">{text.allTypes}</option>}
              {visibleTargetTypes.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <button
              onClick={loadReviews}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-[#28513b] px-4 font-semibold text-white hover:bg-[#1f3f2f]"
            >
              <RefreshCcw className="h-4 w-4" />
              {text.refresh}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {fetching ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-white/45 bg-white/35 text-[#28513b]">
            <Loader className="mr-2 h-5 w-5 animate-spin" />
            {text.loading}
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-white/45 bg-white/35 text-[#28513b]">
            <Clock className="mr-2 h-5 w-5" />
            {text.empty}
          </div>
        ) : (
          <div className="grid gap-4">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-lg border border-white/50 bg-white/72 p-5 shadow-[0_18px_44px_rgba(27,79,49,0.10)]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(review.status)}`}>
                        {review.status}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${riskClass(review.riskLevel)}`}>
                        {review.riskLevel}
                      </span>
                      <span className="rounded-full border border-[#9cc69e] bg-[#edf7e7] px-3 py-1 text-xs font-bold text-[#28513b]">
                        {review.targetType}
                      </span>
                      <span className="rounded-full border border-[#9cc69e] bg-white px-3 py-1 text-xs font-bold text-[#28513b]">
                        {review.submissionType}
                      </span>
                    </div>
                    <h2 className="break-all text-lg font-bold text-[#204932]">{text.target}: {review.targetId}</h2>
                    <div className="mt-3 grid gap-2 text-sm text-[#315842] md:grid-cols-2">
                      <p><strong>{text.submitter}:</strong> {review.submittedBy?.name || review.submittedBy?.email || review.submittedById}</p>
                      <p><strong>{text.reviewedBy}:</strong> {review.reviewedBy?.name || review.reviewedBy?.email || '-'}</p>
                      <p><strong>{text.reviewedAt}:</strong> {review.reviewedAt ? new Date(review.reviewedAt).toLocaleString() : '-'}</p>
                      <p><strong>{text.flags}:</strong> {review.flags.length > 0 ? review.flags.join(', ') : '-'}</p>
                    </div>
                    {review.summary && (
                      <p className="mt-3 rounded-md border border-[#c8dec2] bg-[#f4fbef] px-3 py-2 text-sm text-[#315842]">
                        <strong>{text.summary}:</strong> {review.summary}
                      </p>
                    )}
                  </div>

                  {review.status === 'PENDING' && (
                    <div className="w-full shrink-0 space-y-3 xl:w-[360px]">
                      <select
                        value={reasonCode}
                        onChange={(event) => setReasonCode(event.target.value)}
                        className="w-full rounded-md border border-[#9cc69e] bg-white px-3 py-2 text-sm text-[#204932] outline-none focus:border-[#28513b]"
                      >
                        <option value="">{text.reasonPlaceholder}</option>
                        {reasonCodeOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <textarea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        placeholder={text.commentPlaceholder}
                        rows={3}
                        className="w-full resize-none rounded-md border border-[#9cc69e] bg-white px-3 py-2 text-sm text-[#204932] outline-none focus:border-[#28513b]"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => decide(review, 'approve')}
                          disabled={activeReviewId === review.id}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                        >
                          {activeReviewId === review.id ? <Loader className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          {activeReviewId === review.id ? text.deciding : text.approve}
                        </button>
                        <button
                          onClick={() => decide(review, 'reject')}
                          disabled={activeReviewId === review.id}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          {activeReviewId === review.id ? <Loader className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          {text.reject}
                        </button>
                        <button
                          onClick={() => decide(review, 'requestChanges')}
                          disabled={activeReviewId === review.id}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-sky-700 px-4 py-2.5 font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                        >
                          {activeReviewId === review.id ? <Loader className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                          {text.requestChanges}
                        </button>
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={() => decide(review, 'hide')}
                            disabled={activeReviewId === review.id}
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-700 px-4 py-2.5 font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
                          >
                            {activeReviewId === review.id ? <Loader className="h-4 w-4 animate-spin" /> : <ArchiveX className="h-4 w-4" />}
                            {text.hide}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {review.status !== 'PENDING' && review.decisions?.[0] && (
                    <div className="w-full shrink-0 rounded-md border border-[#c8dec2] bg-[#f4fbef] p-4 text-sm text-[#315842] xl:w-[320px]">
                      <p className="font-bold text-[#204932]">{review.decisions[0].decision}</p>
                      <p className="mt-2">{text.reason}: {review.decisions[0].reasonCode || '-'}</p>
                      <p className="mt-1">{text.comment}: {review.decisions[0].comment || '-'}</p>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReviewsPage;
