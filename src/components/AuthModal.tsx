import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone } from 'lucide-react';
import { signIn, signUp } from '../lib/backend';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup';
  onModeChange: (mode: 'signin' | 'signup') => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, mode, onModeChange }) => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nickname: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(formData.email, formData.password);
        if (error) throw error;
      } else {
        const { error } = await signUp(formData.email, formData.password, {
          nickname: formData.nickname,
          phone: formData.phone || undefined
        });
        if (error) throw error;
      }
      
      onClose();
      setFormData({
        email: '',
        password: '',
        nickname: '',
        phone: ''
      });
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : (lang === 'zh' ? '认证失败' : 'Authentication failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'signin' ? (lang === 'zh' ? '登录' : 'Sign In') : (lang === 'zh' ? '创建账号' : 'Create Account')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'zh' ? '昵称' : 'Nickname'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={lang === 'zh' ? '输入你想展示的昵称' : 'Enter the nickname to display'}
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {lang === 'zh' ? '昵称会显示在个人主页和商品信息中。' : 'Your nickname will appear on your profile and listings.'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'zh' ? '手机号（选填）' : 'Phone (Optional)'}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={lang === 'zh' ? '你的手机号' : 'Your phone number'}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lang === 'zh' ? '邮箱' : 'Email'}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={lang === 'zh' ? 'your.email@university.edu' : 'your.email@university.edu'}
                required
              />
            </div>
            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/forgot-password');
                }}
                className="mt-2 block text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {lang === 'zh' ? '忘记密码？' : 'Forgot password?'}
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lang === 'zh' ? '密码' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={lang === 'zh' ? '你的密码' : 'Your password'}
                required
                minLength={8}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? (lang === 'zh' ? '处理中...' : 'Loading...') : (mode === 'signin' ? (lang === 'zh' ? '登录' : 'Sign In') : (lang === 'zh' ? '创建账号' : 'Create Account'))}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {mode === 'signin' ? (lang === 'zh' ? '还没有账号？' : "Don't have an account?") : (lang === 'zh' ? '已有账号？' : 'Already have an account?')}
            <button
              onClick={() => onModeChange(mode === 'signin' ? 'signup' : 'signin')}
              className="ml-1 text-blue-600 hover:text-blue-700 font-medium"
            >
              {mode === 'signin' ? (lang === 'zh' ? '去注册' : 'Sign up') : (lang === 'zh' ? '去登录' : 'Sign in')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
