import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, User, LogOut, Menu } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">足球荣耀殿堂</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-blue-600 px-3 py-2">
              首页
            </Link>
            <Link to="/glory-hall" className="text-gray-700 hover:text-blue-600 px-3 py-2">
              荣耀殿堂
            </Link>
            
            {user ? (
              <>
                <Link to="/tournaments" className="text-gray-700 hover:text-blue-600 px-3 py-2">
                  杯赛管理
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin/users" className="text-gray-700 hover:text-blue-600 px-3 py-2">
                    用户管理
                  </Link>
                )}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-600" />
                    <span className="text-gray-700">{user.username}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-800 px-3 py-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>退出</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-gray-700 hover:text-blue-600 px-3 py-2">
                  登录
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  注册
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-blue-600 p-2"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link to="/" className="block px-3 py-2 text-gray-700 hover:text-blue-600">
                首页
              </Link>
              <Link to="/glory-hall" className="block px-3 py-2 text-gray-700 hover:text-blue-600">
                荣耀殿堂
              </Link>
              
              {user ? (
                <>
                  <Link to="/tournaments" className="block px-3 py-2 text-gray-700 hover:text-blue-600">
                    杯赛管理
                  </Link>
                  {user.role === 'admin' && (
                    <Link to="/admin/users" className="block px-3 py-2 text-gray-700 hover:text-blue-600">
                      用户管理
                    </Link>
                  )}
                  <div className="border-t pt-2">
                    <div className="flex items-center px-3 py-2">
                      <User className="h-5 w-5 text-gray-600 mr-2" />
                      <span className="text-gray-700">{user.username}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      退出
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="block px-3 py-2 text-gray-700 hover:text-blue-600">
                    登录
                  </Link>
                  <Link to="/register" className="block px-3 py-2 text-blue-600 hover:text-blue-800"
                  >
                    注册
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
