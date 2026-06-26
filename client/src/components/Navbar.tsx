import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, Menu, Trophy, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { authAPI } from '../services/api';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const submitPassword = async () => {
    if (newPassword.length < 6) {
      alert(t('password.minLength'));
      return;
    }

    setSavingPassword(true);
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      setShowPasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      alert(t('password.saved'));
    } catch (err: any) {
      alert(err.response?.data?.error || t('password.failed'));
    } finally {
      setSavingPassword(false);
    }
  };

  const closeMobileMenu = () => setIsMenuOpen(false);

  const LanguageSwitch = () => (
    <div className="inline-flex overflow-hidden rounded border border-gray-200 text-xs">
      <button type="button" onClick={() => setLanguage('zh')} className={`px-2 py-1 ${language === 'zh' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>中文</button>
      <button type="button" onClick={() => setLanguage('en')} className={`px-2 py-1 ${language === 'en' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>EN</button>
    </div>
  );

  const UserActions = () => (
    <div className="relative">
      <button type="button" onClick={() => setShowUserMenu(open => !open)} className="flex items-center space-x-2 rounded px-3 py-2 text-gray-700 hover:bg-gray-50 hover:text-blue-600">
        <User className="h-5 w-5 text-gray-600" />
        <span>{user?.username}</span>
      </button>
      {showUserMenu && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border bg-white py-2 shadow-lg">
          <div className="px-3 py-2">
            <div className="mb-2 text-xs font-medium text-gray-500">{language === 'zh' ? '默认语言' : 'Default language'}</div>
            <LanguageSwitch />
          </div>
          <button onClick={() => { setShowPasswordDialog(true); setShowUserMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600">
            <KeyRound className="h-4 w-4" />
            <span>{t('nav.changePassword')}</span>
          </button>
          <button onClick={handleLogout} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50 hover:text-red-800">
            <LogOut className="h-4 w-4" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <nav className="bg-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">{t('app.name')}</span>
            </Link>
          </div>

          <div className="hidden items-center space-x-6 md:flex">
            <Link to="/" className="px-3 py-2 text-gray-700 hover:text-blue-600">{t('nav.home')}</Link>
            <Link to="/glory-hall" className="px-3 py-2 text-gray-700 hover:text-blue-600">{t('nav.gloryHall')}</Link>
            {user ? (
              <>
                <Link to="/tournaments" className="px-3 py-2 text-gray-700 hover:text-blue-600">{t('nav.tournaments')}</Link>
                <Link to="/llm-settings" className="px-3 py-2 text-gray-700 hover:text-blue-600">{t('nav.aiSettings')}</Link>
                {user.role === 'admin' && <Link to="/admin/users" className="px-3 py-2 text-gray-700 hover:text-blue-600">{t('nav.userAdmin')}</Link>}
                {user.role === 'admin' && <Link to="/admin/llm" className="px-3 py-2 text-gray-700 hover:text-blue-600">{t('nav.llmAdmin')}</Link>}
                <UserActions />
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <LanguageSwitch />
                <Link to="/login" className="px-3 py-2 text-gray-700 hover:text-blue-600">{t('nav.login')}</Link>
                <Link to="/register" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">{t('nav.register')}</Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 md:hidden">
            {!user && <LanguageSwitch />}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-700 hover:text-blue-600">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
              <Link to="/" onClick={closeMobileMenu} className="block px-3 py-2 text-gray-700 hover:text-blue-600">{t('nav.home')}</Link>
              <Link to="/glory-hall" onClick={closeMobileMenu} className="block px-3 py-2 text-gray-700 hover:text-blue-600">{t('nav.gloryHall')}</Link>
              {user ? (
                <>
                  <Link to="/tournaments" onClick={closeMobileMenu} className="block px-3 py-2 text-gray-700 hover:text-blue-600">{t('nav.tournaments')}</Link>
                  <Link to="/llm-settings" onClick={closeMobileMenu} className="block px-3 py-2 text-gray-700 hover:text-blue-600">{t('nav.aiSettings')}</Link>
                  {user.role === 'admin' && <Link to="/admin/users" onClick={closeMobileMenu} className="block px-3 py-2 text-gray-700 hover:text-blue-600">{t('nav.userAdmin')}</Link>}
                  {user.role === 'admin' && <Link to="/admin/llm" onClick={closeMobileMenu} className="block px-3 py-2 text-gray-700 hover:text-blue-600">{t('nav.llmAdmin')}</Link>}
                  <div className="border-t pt-2">
                    <div className="flex items-center px-3 py-2">
                      <User className="mr-2 h-5 w-5 text-gray-600" />
                      <span className="text-gray-700">{user.username}</span>
                    </div>
                    <div className="px-3 py-2">
                      <div className="mb-2 text-xs font-medium text-gray-500">{language === 'zh' ? '默认语言' : 'Default language'}</div>
                      <LanguageSwitch />
                    </div>
                    <button onClick={() => setShowPasswordDialog(true)} className="block w-full px-3 py-2 text-left text-gray-700 hover:text-blue-600">{t('nav.changePassword')}</button>
                    <button onClick={handleLogout} className="block w-full px-3 py-2 text-left text-red-600 hover:text-red-800">{t('nav.logout')}</button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={closeMobileMenu} className="block px-3 py-2 text-gray-700 hover:text-blue-600">{t('nav.login')}</Link>
                  <Link to="/register" onClick={closeMobileMenu} className="block px-3 py-2 text-blue-600 hover:text-blue-800">{t('nav.register')}</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showPasswordDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">{t('password.title')}</h2>
            <p className="mt-1 text-sm text-gray-600">{t('password.help')}</p>
            <input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="input mt-4" placeholder={t('password.current')} autoFocus />
            <input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="input mt-3" placeholder={t('password.new')} />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowPasswordDialog(false)} className="rounded bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200">{t('common.cancel')}</button>
              <button type="button" onClick={submitPassword} disabled={savingPassword || !currentPassword || newPassword.length < 6} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
                {savingPassword ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
