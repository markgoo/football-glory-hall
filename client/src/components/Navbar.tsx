import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, Menu, Trophy, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const submitPassword = async () => {
    if (newPassword.length < 6) {
      alert('新密码至少 6 位');
      return;
    }

    setSavingPassword(true);
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      setShowPasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      alert('密码已修改');
    } catch (err: any) {
      alert(err.response?.data?.error || '修改密码失败');
    } finally {
      setSavingPassword(false);
    }
  };

  const closeMobileMenu = () => setIsMenuOpen(false);

  const UserActions = () => (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <User className="h-5 w-5 text-gray-600" />
        <span className="text-gray-700">{user?.username}</span>
      </div>
      <button onClick={() => setShowPasswordDialog(true)} className="flex items-center space-x-1 px-3 py-2 text-gray-700 hover:text-blue-600">
        <KeyRound className="h-4 w-4" />
        <span>修改密码</span>
      </button>
      <button onClick={handleLogout} className="flex items-center space-x-1 px-3 py-2 text-red-600 hover:text-red-800">
        <LogOut className="h-4 w-4" />
        <span>退出</span>
      </button>
    </div>
  );

  return (
    <nav className="bg-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">足球荣耀殿堂</span>
            </Link>
          </div>

          <div className="hidden items-center space-x-6 md:flex">
            <Link to="/" className="px-3 py-2 text-gray-700 hover:text-blue-600">首页</Link>
            <Link to="/glory-hall" className="px-3 py-2 text-gray-700 hover:text-blue-600">荣耀殿堂</Link>
            {user ? (
              <>
                <Link to="/tournaments" className="px-3 py-2 text-gray-700 hover:text-blue-600">杯赛管理</Link>
                <Link to="/llm-settings" className="px-3 py-2 text-gray-700 hover:text-blue-600">AI配置</Link>
                {user.role === 'admin' && <Link to="/admin/users" className="px-3 py-2 text-gray-700 hover:text-blue-600">用户管理</Link>}
                {user.role === 'admin' && <Link to="/admin/llm" className="px-3 py-2 text-gray-700 hover:text-blue-600">LLM管理</Link>}
                <UserActions />
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="px-3 py-2 text-gray-700 hover:text-blue-600">登录</Link>
                <Link to="/register" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">注册</Link>
              </div>
            )}
          </div>

          <div className="flex items-center md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-700 hover:text-blue-600">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
              <Link to="/" onClick={closeMobileMenu} className="block px-3 py-2 text-gray-700 hover:text-blue-600">首页</Link>
              <Link to="/glory-hall" onClick={closeMobileMenu} className="block px-3 py-2 text-gray-700 hover:text-blue-600">荣耀殿堂</Link>
              {user ? (
                <>
                  <Link to="/tournaments" onClick={closeMobileMenu} className="block px-3 py-2 text-gray-700 hover:text-blue-600">杯赛管理</Link>
                  <Link to="/llm-settings" onClick={closeMobileMenu} className="block px-3 py-2 text-gray-700 hover:text-blue-600">AI配置</Link>
                  {user.role === 'admin' && <Link to="/admin/users" onClick={closeMobileMenu} className="block px-3 py-2 text-gray-700 hover:text-blue-600">用户管理</Link>}
                  {user.role === 'admin' && <Link to="/admin/llm" onClick={closeMobileMenu} className="block px-3 py-2 text-gray-700 hover:text-blue-600">LLM管理</Link>}
                  <div className="border-t pt-2">
                    <div className="flex items-center px-3 py-2">
                      <User className="mr-2 h-5 w-5 text-gray-600" />
                      <span className="text-gray-700">{user.username}</span>
                    </div>
                    <button onClick={() => setShowPasswordDialog(true)} className="block w-full px-3 py-2 text-left text-gray-700 hover:text-blue-600">修改密码</button>
                    <button onClick={handleLogout} className="block w-full px-3 py-2 text-left text-red-600 hover:text-red-800">退出</button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={closeMobileMenu} className="block px-3 py-2 text-gray-700 hover:text-blue-600">登录</Link>
                  <Link to="/register" onClick={closeMobileMenu} className="block px-3 py-2 text-blue-600 hover:text-blue-800">注册</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showPasswordDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">修改密码</h2>
            <p className="mt-1 text-sm text-gray-600">需要输入当前密码。</p>
            <input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="input mt-4" placeholder="当前密码" autoFocus />
            <input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="input mt-3" placeholder="新密码，至少 6 位" />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowPasswordDialog(false)} className="rounded bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200">取消</button>
              <button type="button" onClick={submitPassword} disabled={savingPassword || !currentPassword || newPassword.length < 6} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
                {savingPassword ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
