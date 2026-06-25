import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Calendar, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Home: React.FC = () => {
  const { user } = useAuth();
  const startPath = user ? '/tournaments' : '/register';

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-20">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          欢迎来到足球荣耀殿堂
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          创建你的梦幻杯赛，管理球队，见证历史的诞生。从草根到传奇，每一步都记录在荣耀殿堂中。
        </p>
        <div className="space-x-4">
          <Link
            to={startPath}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Trophy className="w-5 h-5 mr-2" />
            开始你的传奇
          </Link>
          <Link
            to="/glory-hall"
            className="inline-flex items-center px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <Shield className="w-5 h-5 mr-2" />
            查看荣耀殿堂
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gray-50 rounded-2xl mb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">游戏特色</h2>
            <p className="text-lg text-gray-600">体验完整的足球管理游戏</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">创建杯赛</h3>
              <p className="text-gray-600">
                自定义杯赛规则，邀请球队，打造属于你的锦标赛
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">球队管理</h3>
              <p className="text-gray-600">
                创建和管理你的球队，设置战术，培养球员
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">历史记录</h3>
              <p className="text-gray-600">
                每场比赛都有详细记录，永久保存在荣耀殿堂中
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">游戏统计</h2>
          <p className="text-lg text-gray-600">看看其他玩家的成就</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">1,234</div>
            <div className="text-gray-600">总杯赛数</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">5,678</div>
            <div className="text-gray-600">总球队数</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">12,345</div>
            <div className="text-gray-600">总比赛数</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-red-600 mb-2">89</div>
            <div className="text-gray-600">传奇冠军</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
