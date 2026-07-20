import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, AlertCircle, Trash2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { apiClient, Category } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

const DonationFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form state
  const [description, setDescription] = useState('');
  const [agreeBring, setAgreeBring] = useState(true);
  const [agreeClean, setAgreeClean] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [donationCategoryId, setDonationCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);

  // UI state
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load categories and find or create donation category
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiClient.getCategories();
        setCategories(response.data || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setError(lang === 'zh' ? '仅支持图片文件' : 'Only image files are allowed');
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(lang === 'zh' ? '图片需小于 10MB' : 'Image size must be less than 10MB');
        return false;
      }
      return true;
    });

    if (validFiles.length + selectedFiles.length > 5) {
      setError(lang === 'zh' ? '最多上传 5 张图片' : 'Maximum 5 images allowed');
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setError(null);
  };

  const handleRemoveImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];

    for (const file of selectedFiles) {
      try {
        const data = await apiClient.uploadFile(file);
        urls.push(data.data.path);
      } catch (err) {
        console.error('Image upload error:', err);
        throw new Error(lang === 'zh' ? '上传图片失败' : 'Failed to upload image');
      }
    }

    return urls;
  };

  const handleSubmit = async () => {
    if (!user) {
      setError(lang === 'zh' ? '请先登录后再捐赠' : 'Please log in to donate items');
      return;
    }

    if (!description.trim()) {
      setError(lang === 'zh' ? '请填写捐赠描述' : 'Please describe your donation');
      return;
    }

    if (selectedFiles.length === 0) {
      setError(lang === 'zh' ? '请至少上传一张图片' : 'Please add at least one image');
      return;
    }

    if (!agreeBring || !agreeClean) {
      setError(lang === 'zh' ? '请勾选并同意所有捐赠条款' : 'Please agree to all donation terms');
      return;
    }

    if (!donationCategoryId) {
      setError(lang === 'zh' ? '请选择捐赠分类' : 'Please select a donation category');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Upload images
      setUploading(true);
      const imageUrls = await uploadImages();
      setUploading(false);

      const response = await apiClient.createDonation({
        description,
        categoryId: donationCategoryId,
        images: imageUrls
      });

      // Navigate to thank you page
      navigate('/donation/thanks', { state: { reviewStatus: response.data.reviewStatus } });
    } catch (err) {
      setError(err instanceof Error ? err.message : (lang === 'zh' ? '提交捐赠失败' : 'Failed to submit donation'));
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-emerald-100 to-sky-50 py-12">
      <div className="max-w-6xl mx-auto px-6">

        <div className="mb-6 flex items-center">
          <button
            onClick={() => navigate('/donation')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            disabled={submitting || uploading}
          >
            {lang === 'zh' ? '返回' : 'Back'}
          </button>
        </div>

        <div className="mb-8 flex justify-center">
          <div className="inline-block bg-emerald-50 border-2 border-emerald-200 rounded-full px-12 py-4 shadow-[0_8px_0_rgba(16,185,129,0.08)]">
            <h1 className="text-3xl md:text-4xl font-bold text-emerald-800">
              {lang === 'zh' ? '让物品焕发第二次生命' : 'Give Your Items a Second Life'}
            </h1>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="mb-8">
          <div className="inline-block bg-emerald-100/60 rounded-full px-8 py-3 shadow-inner text-emerald-800">
            {lang === 'zh' ? '基本信息' : 'Basic Information'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6 items-start mb-8">
          {/* Images Section */}
          <div className="md:col-span-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={submitting || uploading || previewUrls.length >= 5}
            />

            {previewUrls.length > 0 ? (
              <div className="space-y-2">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-48 object-cover rounded-xl border-2 border-emerald-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={submitting || uploading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {previewUrls.length < 5 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting || uploading}
                    className="w-full bg-emerald-100/60 rounded-xl p-8 flex items-center justify-center border-2 border-dashed border-emerald-300 hover:border-emerald-400 transition-colors"
                  >
                    <span className="text-emerald-900">+ {lang === 'zh' ? '继续添加' : 'Add More'} ({previewUrls.length}/5)</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-emerald-100/60 rounded-xl p-8 h-72 flex flex-col items-center justify-center shadow-lg border border-emerald-200">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting || uploading}
                  className="flex flex-col items-center gap-3 text-emerald-900"
                >
                  <ImageIcon className="h-12 w-12" />
                  <span className="text-lg">{lang === 'zh' ? '添加图片' : 'Add your images'}</span>
                  <span className="text-sm text-emerald-700">{lang === 'zh' ? '最多5张 • 每张10MB' : 'Max 5 images • 10MB each'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="md:col-span-2">
            <div className="bg-emerald-50 rounded-xl p-10 h-72 flex items-center justify-center border-2 border-emerald-200 shadow-[8px_8px_0_rgba(16,185,129,0.06)]">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={lang === 'zh' ? '描述捐赠物品...(捐赠什么、成色、补充说明等)' : 'Describe your goods... (What are you donating? Condition? Any special notes?)'}
                className="w-full h-full bg-transparent resize-none outline-none text-emerald-800 placeholder:opacity-80"
                disabled={submitting || uploading}
              />
            </div>
            <p className="mt-2 text-sm text-emerald-700 text-right">
              {description.length}/1000 {lang === 'zh' ? '字' : 'characters'}
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-emerald-800 mb-2">
                {lang === 'zh' ? '捐赠分类' : 'Donation Category'}
              </label>
              <select
                value={donationCategoryId}
                onChange={(e) => setDonationCategoryId(e.target.value)}
                className="w-full rounded-lg border-2 border-emerald-200 bg-white px-4 py-3 text-emerald-900 focus:outline-none focus:border-emerald-400"
                disabled={submitting || uploading || categories.length === 0}
              >
                <option value="">
                  {categories.length === 0
                    ? (lang === 'zh' ? '分类加载中...' : 'Loading categories...')
                    : (lang === 'zh' ? '请选择分类' : 'Select a category')}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="inline-block bg-emerald-100/60 rounded-full px-8 py-3 shadow-inner text-emerald-800">
            {lang === 'zh' ? '捐赠协议' : 'Donation Agreement'}
          </div>
        </div>

        <div className="space-y-4 mb-12">
          <label className="flex items-start gap-4">
            <input
              type="checkbox"
              checked={agreeBring}
              onChange={() => setAgreeBring(!agreeBring)}
              className="mt-1"
              disabled={submitting || uploading}
            />
            <span className="text-emerald-800">
              {lang === 'zh'
                ? '我同意在学期末将捐赠物品带到校园指定回收点。'
                : 'I agree to bring the donated item to the designated campus collection area at the end of the semester.'}
            </span>
          </label>

          <label className="flex items-start gap-4">
            <input
              type="checkbox"
              checked={agreeClean}
              onChange={() => setAgreeClean(!agreeClean)}
              className="mt-1"
              disabled={submitting || uploading}
            />
            <span className="text-emerald-800">
              {lang === 'zh'
                ? '我确认所有捐赠物品均为清洁且可使用状态。'
                : 'I confirm that all donated items are in clean and usable condition.'}
            </span>
          </label>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={submitting || uploading || !agreeBring || !agreeClean}
            className="bg-emerald-50 border-2 border-emerald-200 rounded-full px-12 py-4 shadow-[0_8px_0_rgba(16,185,129,0.08)] text-emerald-800 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-100 transition-colors flex items-center gap-2"
          >
            {uploading && <Loader className="h-5 w-5 animate-spin" />}
            {submitting && !uploading && <Loader className="h-5 w-5 animate-spin" />}
            {uploading ? (lang === 'zh' ? '上传图片中...' : 'Uploading Images...') : submitting ? (lang === 'zh' ? '提交中...' : 'Submitting...') : (lang === 'zh' ? '确认捐赠' : 'Confirm Donation')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default DonationFormPage;
