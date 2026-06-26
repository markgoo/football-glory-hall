import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.passwordMin'));
      return;
    }

    setLoading(true);
    try {
      await register(username, email, password);
      navigate('/');
    } catch (error: any) {
      setError(error.response?.data?.error || t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">{t('auth.registerTitle')}</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('auth.or')}{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              {t('auth.backToLogin')}
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4 rounded-md shadow-sm">
            <Field icon={<User className="h-5 w-5 text-gray-400" />} label={t('auth.username')}>
              <input
                name="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="input w-full pl-10"
                placeholder={t('auth.usernamePlaceholder')}
              />
            </Field>

            <Field icon={<Mail className="h-5 w-5 text-gray-400" />} label={t('auth.email')}>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input w-full pl-10"
                placeholder="your@email.com"
              />
            </Field>

            <Field icon={<Lock className="h-5 w-5 text-gray-400" />} label={t('auth.password')}>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input w-full pl-10 pr-10"
                placeholder="••••••••"
              />
              <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
              </button>
            </Field>

            <Field icon={<Lock className="h-5 w-5 text-gray-400" />} label={t('auth.confirmPassword')}>
              <input
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="input w-full pl-10 pr-10"
                placeholder="••••••••"
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? t('auth.registering') : t('auth.register')}
          </button>
        </form>
      </div>
    </div>
  );
};

const Field: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-700">{label}</span>
    <span className="relative mt-1 block">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">{icon}</span>
      {children}
    </span>
  </label>
);

export default Register;
